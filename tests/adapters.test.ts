import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { publish } from "@/lib/publish/adapters";
import { encryptJson } from "@/lib/crypto";

let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => net?.restore());
const base = { threadTail: ["part two", "part three"], media: [], channelId: "ch", handle: "@me", tokenExpiry: new Date(Date.now() + 864e5).toISOString() };

describe("retries never post twice", () => {
  it("Bluesky: a thread that fails part-way resumes after the parts already posted", async () => {
    const posted: { text: string; reply?: { root: { uri: string } } }[] = [];
    let failOnce = true;
    net = installFakeNet((r) => {
      if (r.url.pathname.includes("createSession")) return json({ accessJwt: "jwt", did: "did:plc:me" });
      if (r.url.pathname.includes("createRecord")) {
        const rec = (r.body as { record: { text: string } }).record;
        if (rec.text === "part two" && failOnce) {
          failOnce = false;
          return json({ error: "RateLimitExceeded" }, 429);
        }
        posted.push(rec);
        return json({ uri: `at://did:plc:me/app.bsky.feed.post/${posted.length}`, cid: `cid${posted.length}` });
      }
    });
    const enc = encryptJson({ service: "https://pds.test", identifier: "me", app_password: "x" });
    let saved: string[] = [];
    const first = await publish({ ...base, body: "part one", platform: "bluesky", encryptedTokens: enc, onThreadProgress: async (ids) => void (saved = ids) });
    expect(first.ok).toBe(false);
    const retry = await publish({ ...base, body: "part one", platform: "bluesky", encryptedTokens: enc, threadIds: saved, onThreadProgress: async (ids) => void (saved = ids) });
    expect(retry.ok).toBe(true);
    expect(posted.map((p) => p.text)).toEqual(["part one", "part two", "part three"]);
    expect(posted[2].reply?.root.uri).toBe("at://did:plc:me/app.bsky.feed.post/1");
  });

  it("Mastodon: stable idempotency key per part across retries", async () => {
    const keys: string[] = [];
    let failOnce = true;
    net = installFakeNet((r) => {
      if (!r.url.pathname.endsWith("/api/v1/statuses")) return undefined;
      keys.push(`${(r.body as { status: string }).status}|${r.headers.get("idempotency-key")}`);
      if ((r.body as { status: string }).status === "part two" && failOnce) {
        failOnce = false;
        return json({ error: "boom" }, 503);
      }
      return json({ id: `s${keys.length}`, url: "u" });
    });
    const enc = encryptJson({ instance: "https://masto.test", access_token: "t" });
    let saved: string[] = [];
    await publish({ ...base, body: "part one", platform: "mastodon", encryptedTokens: enc, idempotencyKey: "target-1", onThreadProgress: async (ids) => void (saved = ids) });
    await publish({ ...base, body: "part one", platform: "mastodon", encryptedTokens: enc, idempotencyKey: "target-1", threadIds: saved, onThreadProgress: async (ids) => void (saved = ids) });
    expect(keys).toEqual(["part one|target-1:0", "part two|target-1:1", "part two|target-1:1", "part three|target-1:2"]);
  });

  it("YouTube: a lost upload response is checked against the session before any retry", async () => {
    const run = async (session: "complete" | "incomplete" | "unknown") => {
      net?.restore();
      net = installFakeNet((r) => {
        if (r.url.host === "cdn.test") return new Response(new Uint8Array(100));
        if (r.url.search.includes("uploadType=resumable")) return new Response("", { status: 200, headers: { location: "https://upload.test/s" } });
        if (r.url.host === "upload.test") {
          if (r.headers.get("content-range")?.startsWith("bytes */")) {
            return session === "complete" ? json({ id: "vid1" }) : session === "incomplete" ? new Response("", { status: 308 }) : new Response("", { status: 503 });
          }
          throw new TypeError("fetch failed (connection reset)");
        }
      });
      const enc = encryptJson({ access_token: "t", refresh_token: "r", expires_at: Date.now() + 864e5 });
      return publish({ ...base, threadTail: [], body: "video", media: [{ url: "https://cdn.test/v.mp4", type: "video/mp4" }], platform: "youtube", encryptedTokens: enc });
    };
    expect(await run("complete")).toMatchObject({ ok: true, platformPostId: "vid1" });
    // Incomplete: nothing was published, so an ordinary (retryable) failure.
    const incomplete = await run("incomplete");
    expect(incomplete.ok).toBe(false);
    expect((incomplete as { uncertain?: boolean }).uncertain).toBeFalsy();
    expect(await run("unknown")).toMatchObject({ ok: false, uncertain: true });
  });

  it("Bluesky and Mastodon send valid posts untouched (no code-point clipping)", async () => {
    const sent: string[] = [];
    net = installFakeNet((r) => {
      if (r.url.pathname.includes("createSession")) return json({ accessJwt: "t", did: "did:x" });
      if (r.url.pathname.includes("createRecord")) return sent.push((r.body as { record: { text: string } }).record.text), json({ uri: "at://x/1", cid: "c" });
      if (r.url.pathname.endsWith("/api/v1/statuses")) return sent.push((r.body as { status: string }).status), json({ id: "1", url: "u" });
    });
    const emoji = "👍🏽".repeat(300);
    const longUrl = "Read https://example.com/" + "x".repeat(600);
    await publish({ ...base, threadTail: [], body: emoji, platform: "bluesky", encryptedTokens: encryptJson({ service: "https://pds", identifier: "a", app_password: "b" }) });
    await publish({ ...base, threadTail: [], body: longUrl, platform: "mastodon", encryptedTokens: encryptJson({ instance: "https://m", access_token: "t" }) });
    expect(sent).toEqual([emoji, longUrl]);
  });
});

describe("TikTok: a post still processing isn't reported as published", () => {
  const run = async (status: string, extra: Record<string, unknown> = {}) => {
    net?.restore();
    net = installFakeNet((r) => {
      if (r.url.pathname.endsWith("/post/publish/status/fetch/")) return json({ data: { status, ...extra }, error: { code: "ok" } });
      if (r.url.pathname.includes("/post/publish/")) throw new Error("must not upload again");
    });
    const enc = encryptJson({ access_token: "t", refresh_token: "r" });
    return publish({ ...base, threadTail: [], body: "clip", media: [{ url: "https://cdn.test/v.mp4", type: "video/mp4" }], platform: "tiktok", encryptedTokens: enc, pendingRef: "v_pub_1" });
  };
  it("checks the earlier upload instead of uploading again", async () => {
    expect(await run("PROCESSING_UPLOAD")).toMatchObject({ ok: false, pendingRef: "v_pub_1" });
    expect(await run("PUBLISH_COMPLETE", { publicaly_available_post_id: [7123] })).toMatchObject({ ok: true, platformPostId: "7123" });
    expect(await run("PUBLISH_COMPLETE")).toMatchObject({ ok: true, platformPostId: "v_pub_1" });
    const failed = await run("FAILED", { fail_reason: "spam_risk" });
    expect(failed).toMatchObject({ ok: false, error: "TikTok publish failed: spam_risk" });
    expect((failed as { pendingRef?: string }).pendingRef).toBeUndefined();
  });
});

describe("a post whose outcome is unclear is never sent again automatically", () => {
  const send = async (platform: "x" | "linkedin" | "facebook", reply: () => Response) => {
    net?.restore();
    net = installFakeNet((r) => {
      if (r.url.pathname.endsWith("/tweets") || r.url.pathname.endsWith("/rest/posts") || r.url.pathname.endsWith("/feed")) return reply();
    });
    const enc = encryptJson({ access_token: "t", author_urn: "urn:li:person:me", page_id: "pg" });
    return publish({ ...base, threadTail: [], body: "hello", platform, encryptedTokens: enc, tokenExpiry: null });
  };
  it("a server error or a lost reply is uncertain (the post may be live)", async () => {
    for (const platform of ["x", "linkedin", "facebook"] as const) {
      expect(await send(platform, () => json({ title: "Service Unavailable" }, 503))).toMatchObject({ ok: false, uncertain: true });
      expect(await send(platform, () => { throw new TypeError("fetch failed (socket hang up)"); })).toMatchObject({ ok: false, uncertain: true });
    }
    expect(await send("x", () => new Response("<html>", { status: 200 }))).toMatchObject({ ok: false, uncertain: true });
  });
  it("a refusal or a request that never left is an ordinary (retryable) failure", async () => {
    for (const platform of ["x", "linkedin", "facebook"] as const) {
      const refused = await send(platform, () => json({ detail: "nope", message: "nope", error: { message: "nope" } }, 400));
      expect(refused.ok).toBe(false);
      expect((refused as { uncertain?: boolean }).uncertain).toBeFalsy();
    }
    const dns = await send("x", () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }); });
    expect((dns as { uncertain?: boolean }).uncertain).toBeFalsy();
  });
});

describe("TikTok: the audience is never changed behind the user's back", () => {
  const send = async (options: string[], uploads: string[], env?: string) => {
    net?.restore();
    if (env) process.env.TIKTOK_PRIVACY_LEVEL = env;
    else delete process.env.TIKTOK_PRIVACY_LEVEL;
    net = installFakeNet((r) => {
      if (r.url.pathname.endsWith("/creator_info/query/")) {
        return json({ data: { privacy_level_options: options, max_video_post_duration_sec: 600 }, error: { code: "ok" } });
      }
      if (r.url.pathname.includes("/post/publish/")) {
        uploads.push((r.body as { post_info?: { privacy_level?: string } })?.post_info?.privacy_level ?? "?");
        return json({ error: { code: "stop_here" } }, 400);
      }
    });
    const enc = encryptJson({ access_token: "t", refresh_token: "r" });
    try {
      return await publish({ ...base, threadTail: [], body: "clip", media: [{ url: "https://cdn.test/v.mp4", type: "video/mp4" }], platform: "tiktok", encryptedTokens: enc, tiktokPrivacyLevel: "PUBLIC_TO_EVERYONE" });
    } finally {
      delete process.env.TIKTOK_PRIVACY_LEVEL;
    }
  };
  it("fails with a clear reason when the chosen audience is no longer offered", async () => {
    const uploads: string[] = [];
    const res = await send(["FOLLOWER_OF_CREATOR", "SELF_ONLY"], uploads);
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining('no longer allows "Everyone"') });
    expect(uploads).toEqual([]); // nothing sent to TikTok
  });
  it("the unaudited-app override still applies", async () => {
    // Forced private while unaudited: an account offering only "Only me" goes ahead (on to the upload).
    const res = await send(["SELF_ONLY"], [], "SELF_ONLY");
    expect((res as { error?: string }).error ?? "").not.toMatch(/no longer allows/);
  });
});
