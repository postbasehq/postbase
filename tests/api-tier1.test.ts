import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeNet, json, type FakeRequest } from "./helpers/fake-net";

// Fetching media_urls goes out over the network and into R2: stand in for it.
vi.mock("@/lib/media-import", async (orig) => ({
  ...(await orig<typeof import("@/lib/media-import")>()),
  importMediaFromUrl: vi.fn(async (_org: string, url: string) => ({
    id: "imported",
    name: "file",
    type: url.endsWith(".mp4") ? "video/mp4" : "image/png",
    size_bytes: 10,
    url: `https://pub-test.r2.dev/o/${url.split("/").pop()}`,
    created_at: "2026-10-10T00:00:00Z",
  })),
}));

import { ApiError, createPost, getPost, retryPost, updatePost } from "@/lib/api-core";
import { postFieldsFrom } from "@/lib/api-input";
import { isPublicIp, urlProblem } from "@/lib/safe-fetch";
import { mediaTypeFor } from "@/lib/media-import";

let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => net?.restore());

const at = () => new Date(Date.now() + 3_600_000).toISOString();
const db = (r: FakeRequest) => r.url.host === "db.test";
const posted = (table: string) => net!.log.find((r) => r.method === "POST" && r.table === table)?.body;

/** A workspace with these channels that accepts writes; `extra` answers first. */
function workspace(channels: { id: string; platform: string }[], extra?: (r: FakeRequest) => Response | undefined) {
  return (r: FakeRequest) => {
    if (!db(r)) return undefined;
    const answered = extra?.(r);
    if (answered) return answered;
    if (r.table === "channels") return json(channels);
    if (r.method === "POST" && r.table === "posts") return json({ id: "p1" });
    if (r.method === "PATCH" && r.table === "posts") return json([{ id: "p1" }]);
    if (r.method === "GET" && r.table === "posts" && r.single) return json(null);
    return json([]);
  };
}

describe("create_post idempotency", () => {
  it("returns the first post for a repeated key, without writing anything", async () => {
    net = installFakeNet(
      workspace([{ id: "x", platform: "x" }], (r) =>
        r.method === "GET" && r.table === "posts" && r.query.includes("idempotency_key=eq.k1")
          ? json({ id: "p0", body: "hi", scheduled_at: null, status: "scheduled", media: [{ id: "m" }] })
          : undefined,
      ),
    );
    const post = await createPost("o", { body: "hi", channelIds: ["x"], scheduledAt: at(), idempotencyKey: "k1" });
    expect(post).toEqual({ id: "p0", body: "hi", scheduled_at: null, status: "scheduled", media: 1, idempotent_replay: true });
    expect(net.writes()).toEqual([]);
  });

  it("stores the key, and a request that loses the race gets the winner's post", async () => {
    let lookups = 0;
    net = installFakeNet(
      workspace([{ id: "x", platform: "x" }], (r) => {
        if (r.method === "GET" && r.table === "posts" && r.query.includes("idempotency_key")) {
          return ++lookups === 1 ? json(null) : json({ id: "winner", body: "hi", scheduled_at: null, status: "scheduled", media: [] });
        }
        if (r.method === "POST" && r.table === "posts") {
          return json({ code: "23505", message: 'duplicate key value violates unique constraint "posts_org_idempotency_key"' }, 409);
        }
        return undefined;
      }),
    );
    const post = await createPost("o", { body: "hi", channelIds: ["x"], scheduledAt: at(), idempotencyKey: "k2" });
    expect(post).toMatchObject({ id: "winner", idempotent_replay: true });
    expect(posted("posts")).toMatchObject({ idempotency_key: "k2" });
  });

  it("rejects an unusable key", async () => {
    net = installFakeNet(workspace([{ id: "x", platform: "x" }]));
    await expect(createPost("o", { body: "hi", channelIds: ["x"], scheduledAt: null, idempotencyKey: "a".repeat(256) })).rejects.toThrow(/idempotency_key/);
  });
});

describe("per-channel text", () => {
  it("saves each channel's own text", async () => {
    net = installFakeNet(workspace([{ id: "x", platform: "x" }, { id: "li", platform: "linkedin" }]));
    await createPost("o", { body: "Long LinkedIn version", channelIds: ["x", "li"], channelBodies: { x: "Short" }, scheduledAt: at() });
    expect(posted("post_targets")).toEqual([
      { post_id: "p1", channel_id: "x", variant_body: "Short", status: "scheduled" },
      { post_id: "p1", channel_id: "li", variant_body: null, status: "scheduled" },
    ]);
  });

  it("checks a channel's own text against its network's limit", async () => {
    net = installFakeNet(workspace([{ id: "x", platform: "x" }, { id: "li", platform: "linkedin" }]));
    await expect(
      createPost("o", { body: "ok", channelIds: ["x", "li"], channelBodies: { x: "y".repeat(400) }, scheduledAt: at() }),
    ).rejects.toThrow();
    expect(net.writes()).toEqual([]);
  });

  it("refuses text for a channel that isn't in the post", async () => {
    net = installFakeNet(workspace([{ id: "x", platform: "x" }]));
    await expect(createPost("o", { body: "hi", channelIds: ["x"], channelBodies: { other: "hi" }, scheduledAt: null })).rejects.toThrow(/channel_bodies/);
  });
});

describe("media_urls", () => {
  it("attaches fetched files after library files, in order", async () => {
    net = installFakeNet(
      workspace([{ id: "x", platform: "x" }], (r) =>
        r.table === "media_library" ? json([{ id: "lib1", url: "https://pub-test.r2.dev/o/lib.png", type: "image/png" }]) : undefined,
      ),
    );
    const post = await createPost("o", {
      body: "hi",
      channelIds: ["x"],
      scheduledAt: at(),
      mediaIds: ["lib1"],
      mediaUrls: ["https://example.com/a.png"],
    });
    expect(post).toMatchObject({ media: 2 });
    expect(posted("media")).toEqual([
      { post_id: "p1", storage_url: "https://pub-test.r2.dev/o/lib.png", type: "image/png" },
      { post_id: "p1", storage_url: "https://pub-test.r2.dev/o/a.png", type: "image/png" },
    ]);
  });

  it("caps how many URLs one call can fetch", async () => {
    net = installFakeNet(workspace([{ id: "x", platform: "x" }]));
    const urls = Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.png`);
    await expect(createPost("o", { body: "hi", channelIds: ["x"], scheduledAt: null, mediaUrls: urls })).rejects.toThrow(/up to 10/);
  });
});

const POST_ROW = {
  id: "p1",
  body: "Hello",
  thread_tail: [],
  scheduled_at: "2026-10-11T09:00:00Z",
  status: "publishing",
  created_at: "2026-10-10T09:00:00Z",
  youtube_privacy: null,
  youtube_options: null,
  media: [],
  post_targets: [
    { channel_id: "x", variant_body: null, status: "published", error: null, platform_post_id: "123", next_attempt_at: null, metrics: { likes: 4 }, channels: { platform: "x", handle: "@postbase" } },
    { channel_id: "bs", variant_body: "Hi Bluesky", status: "failed", error: "Token expired", platform_post_id: null, next_attempt_at: "2026-10-10T10:00:00Z", metrics: null, channels: { platform: "bluesky", handle: "pb.bsky.social" } },
    { channel_id: "li", variant_body: null, status: "scheduled", error: null, platform_post_id: null, next_attempt_at: null, metrics: null, channels: { platform: "linkedin", handle: null } },
  ],
};

describe("get_post", () => {
  it("reports each channel's outcome with its live URL", async () => {
    net = installFakeNet((r) => (db(r) && r.table === "posts" ? json(POST_ROW) : undefined));
    const post = await getPost("o", "p1");
    expect(post.channels[0]).toMatchObject({ status: "published", url: "https://x.com/postbase/status/123", error: null, metrics: { likes: 4 } });
    expect(post.channels[1]).toMatchObject({ status: "failed", url: null, error: "Token expired", retry_at: "2026-10-10T10:00:00Z", body: "Hi Bluesky" });
    expect(post.summary).toEqual({ published: 1, failed: 1, pending: 1 });
    // Scoped to the caller's workspace.
    expect(net.log.find((r) => r.table === "posts")?.query).toContain("org_id=eq.o");
  });

  it("is a 404 for a post that isn't in the workspace", async () => {
    net = installFakeNet((r) => (db(r) ? json(null) : undefined));
    await expect(getPost("o", "nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("update_post", () => {
  it("refuses a post that has started publishing, before writing", async () => {
    net = installFakeNet((r) => (db(r) && r.table === "posts" ? json(POST_ROW) : undefined));
    const e = await updatePost("o", "p1", { body: "changed" }).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(409);
    expect(net.writes()).toEqual([]);
  });

  it("reschedules, keeping the text, channels and per-channel text", async () => {
    const scheduled = {
      ...POST_ROW,
      status: "scheduled",
      post_targets: [
        { channel_id: "x", variant_body: "Short", status: "scheduled", platform_post_id: null, pending_ref: null, thread_ids: null, channels: { platform: "x", handle: "pb" } },
      ],
    };
    net = installFakeNet(
      workspace([{ id: "x", platform: "x" }], (r) => (r.method === "GET" && r.table === "posts" ? json(scheduled) : undefined)),
    );
    const when = at();
    await updatePost("o", "p1", { scheduledAt: when });
    const rewrite = net.log.find((r) => r.method === "PATCH" && r.table === "posts" && (r.body as Record<string, unknown>).body !== undefined);
    expect(rewrite?.body).toMatchObject({ body: "Hello", thread_tail: [], scheduled_at: when });
    expect(rewrite?.query).toContain("org_id=eq.o");
    expect(posted("post_targets")).toEqual([{ post_id: "p1", channel_id: "x", variant_body: "Short", status: "scheduled" }]);
  });

  it("turns a post back into a draft with scheduled_at null", () => {
    expect(postFieldsFrom({ scheduled_at: null })).toEqual({ scheduledAt: null });
    expect(postFieldsFrom({ body: "x" })).toEqual({ body: "x" });
  });
});

describe("retry_post", () => {
  it("re-queues only failed channels that never went out", async () => {
    net = installFakeNet((r) => {
      if (!db(r)) return undefined;
      if (r.table === "posts" && r.method === "GET") return json({ id: "p1", status: "failed" });
      if (r.table === "post_targets" && r.method === "PATCH") return json([{ channel_id: "bs" }]);
      return json([]);
    });
    await expect(retryPost("o", "p1")).resolves.toEqual({ id: "p1", retrying: ["bs"] });
    const q = net.log.find((r) => r.table === "post_targets" && r.method === "PATCH")!.query;
    expect(q).toContain("status=eq.failed");
    expect(q).toContain("platform_post_id=is.null");
  });

  it("says so when there's nothing to retry", async () => {
    net = installFakeNet((r) => (db(r) ? (r.table === "posts" ? json({ id: "p1", status: "published" }) : json([])) : undefined));
    await expect(retryPost("o", "p1")).rejects.toMatchObject({ status: 409, code: "nothing_to_retry" });
  });
});

describe("fetching media from URLs", () => {
  it("only fetches public https URLs", () => {
    expect(urlProblem("https://cdn.example.com/a.png")).toBeNull();
    expect(urlProblem("http://cdn.example.com/a.png")).toMatch(/https/);
    expect(urlProblem("https://user:pw@example.com/a.png")).toMatch(/password/);
    expect(urlProblem("https://example.com:8443/a.png")).toMatch(/port/);
    expect(urlProblem("https://127.0.0.1/a.png")).toMatch(/private/);
    expect(urlProblem("https://169.254.169.254/latest")).toMatch(/private/);
    expect(urlProblem("https://[::1]/a.png")).toMatch(/private/);
    expect(urlProblem("https://metadata.google.internal/x")).toMatch(/private/);
    expect(urlProblem("https://localhost/x")).toMatch(/private/);
  });

  it("knows private addresses", () => {
    for (const ip of ["10.1.2.3", "172.16.0.1", "192.168.1.1", "100.64.0.1", "::ffff:127.0.0.1", "fd00::1"]) expect(isPublicIp(ip)).toBe(false);
    for (const ip of ["8.8.8.8", "104.16.0.1", "2606:4700::1"]) expect(isPublicIp(ip)).toBe(true);
  });

  it("takes the type from the server, or the extension when the server is vague", () => {
    expect(mediaTypeFor("image/png", "https://a.com/x")).toBe("image/png");
    expect(mediaTypeFor("application/octet-stream", "https://a.com/clip.MP4")).toBe("video/mp4");
    expect(mediaTypeFor("text/html", "https://a.com/x.png")).toBeNull();
    expect(mediaTypeFor("", "https://a.com/x.exe")).toBeNull();
  });
});
