import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeNet, json, counted, type FakeRequest } from "./helpers/fake-net";

// Deliveries go out over https: stand in for the network call, keep the URL checks.
const postPublic = vi.fn();
vi.mock("@/lib/safe-fetch", async (orig) => ({
  ...(await orig<typeof import("@/lib/safe-fetch")>()),
  postPublic: (...a: unknown[]) => postPublic(...a),
  // No real DNS in tests: hosts named "private-…" resolve to a private address.
  resolvesPublic: async (u: string) => !new URL(u).hostname.startsWith("private-"),
}));

import { createEndpoint, deliverDueWebhooks, emitEvent, emitPostOutcome, RETRY_MINUTES, signPayload } from "@/lib/webhooks";
import { encryptJson } from "@/lib/crypto";
import { getAnalytics } from "@/lib/analytics/api";

let net: ReturnType<typeof installFakeNet> | undefined;
beforeEach(() => postPublic.mockReset());
afterEach(() => net?.restore());
const db = (r: FakeRequest) => r.url.host === "db.test";
const patches = (table: string) => net!.log.filter((r) => r.method === "PATCH" && r.table === table).map((r) => r.body as Record<string, unknown>);

describe("webhook signatures", () => {
  it("match what the docs tell receivers to compute", () => {
    const secret = "whsec_test";
    const body = JSON.stringify({ id: "e1", type: "post.published" });
    const sig = signPayload(secret, 1791651200, body);
    // The Node.js snippet from docs/api/webhooks.mdx.
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(`1791651200.${body}`).digest("hex");
    expect(sig).toBe(expected);
  });
});

describe("adding an endpoint", () => {
  it("only takes public https URLs and known events", async () => {
    net = installFakeNet((r) => (db(r) ? counted(0) : undefined));
    await expect(createEndpoint("o", { url: "http://example.com/h", events: ["post.published"] })).rejects.toThrow(/https/);
    await expect(createEndpoint("o", { url: "https://10.0.0.5/h", events: ["post.published"] })).rejects.toThrow(/private/);
    await expect(createEndpoint("o", { url: "https://example.com/h", events: ["post.deleted"] })).rejects.toThrow(/Unknown event/);
    await expect(createEndpoint("o", { url: "https://example.com/h", events: [] })).rejects.toThrow(/at least one/);
    expect(net.writes()).toEqual([]);
  });

  it("refuses a host that resolves to a private address", async () => {
    net = installFakeNet((r) => (db(r) ? counted(0) : undefined));
    await expect(createEndpoint("o", { url: "https://private-box.example.com/h", events: ["post.published"] })).rejects.toThrow(/public address/);
    expect(net.writes()).toEqual([]);
  });

  it("stops at the per-workspace limit", async () => {
    net = installFakeNet((r) => (db(r) ? counted(10) : undefined));
    await expect(createEndpoint("o", { url: "https://example.com/h", events: ["post.published"] })).rejects.toThrow(/up to 10/);
  });

  it("stores the secret encrypted and returns it once", async () => {
    net = installFakeNet((r) => {
      if (!db(r)) return undefined;
      if (r.method === "HEAD") return counted(0);
      if (r.method === "POST") return json({ id: "w1", url: "https://example.com/h", events: ["post.published"], secret_hint: "x" });
      return json([]);
    });
    const { secret } = await createEndpoint("o", { url: "https://example.com/h", events: ["post.published", "post.published"] });
    const row = net.log.find((r) => r.method === "POST")!.body as Record<string, unknown>;
    expect(secret).toMatch(/^whsec_/);
    expect(row.encrypted_secret).not.toContain(secret);
    expect(row.events).toEqual(["post.published"]);
    expect(row.org_id).toBe("o");
  });
});

const ENDPOINT = { id: "w1", url: "https://example.com/h", encrypted_secret: encryptJson("whsec_abc") };

describe("sending events", () => {
  it("does nothing when no endpoint wants the event", async () => {
    net = installFakeNet((r) => (db(r) ? json([]) : undefined));
    expect(await emitEvent("o", "post.published", {}, "k")).toBe(0);
    expect(net.writes()).toEqual([]);
    expect(postPublic).not.toHaveBeenCalled();
  });

  it("signs and sends, and records a delivery", async () => {
    postPublic.mockResolvedValue({ status: 200, body: "ok" });
    net = installFakeNet((r) => {
      if (!db(r)) return undefined;
      if (r.table === "webhook_endpoints") return json([ENDPOINT]);
      if (r.method === "POST" && r.table === "webhook_deliveries") {
        return json([{ id: "d1", endpoint_id: "w1", org_id: "o", event_id: "e1", event_type: "post.published", payload: { id: "e1" }, attempts: 0 }]);
      }
      return json([]);
    });
    expect(await emitEvent("o", "post.published", { post: { id: "p1" } }, "k1")).toBe(1);
    const [url, body, headers] = postPublic.mock.calls[0] as [string, string, Record<string, string>];
    expect(url).toBe(ENDPOINT.url);
    expect(headers["postbase-signature"]).toBe(signPayload("whsec_abc", Number(headers["postbase-timestamp"]), body));
    expect(patches("webhook_deliveries")[0]).toMatchObject({ status: "delivered", attempts: 1, response_status: 200 });
    // Only endpoints subscribed to the event, in this workspace.
    const q = net.log.find((r) => r.table === "webhook_endpoints")!.query;
    expect(q).toContain("org_id=eq.o");
    expect(q).toContain("events=cs.{post.published}");
  });

  it("retries a failure later, then gives up after the last retry", async () => {
    postPublic.mockResolvedValue({ status: 500, body: "boom" });
    let attempts = 0;
    net = installFakeNet((r) => {
      if (!db(r)) return undefined;
      if (r.method === "GET" && r.table === "webhook_deliveries") {
        return json([{ id: "d1", endpoint_id: "w1", org_id: "o", event_id: "e1", event_type: "post.failed", payload: {}, attempts, next_attempt_at: "2026-01-01T00:00:00Z" }]);
      }
      if (r.method === "PATCH" && r.table === "webhook_deliveries" && r.query.includes("attempts=eq.")) return json([{ id: "d1" }]);
      if (r.table === "webhook_endpoints") return json(ENDPOINT);
      return json([]);
    });
    await deliverDueWebhooks();
    const first = patches("webhook_deliveries").at(-1)!;
    expect(first).toMatchObject({ status: "pending", attempts: 1, response_status: 500 });
    expect(Date.parse(first.next_attempt_at as string) - Date.now()).toBeGreaterThan(50_000);

    net.restore();
    attempts = RETRY_MINUTES.length;
    net = installFakeNet((r) => {
      if (!db(r)) return undefined;
      if (r.method === "GET" && r.table === "webhook_deliveries") {
        return json([{ id: "d1", endpoint_id: "w1", org_id: "o", event_id: "e1", event_type: "post.failed", payload: {}, attempts, next_attempt_at: "2026-01-01T00:00:00Z" }]);
      }
      if (r.method === "PATCH" && r.table === "webhook_deliveries" && r.query.includes("attempts=eq.")) return json([{ id: "d1" }]);
      if (r.table === "webhook_endpoints") return json(ENDPOINT);
      return json([]);
    });
    await deliverDueWebhooks();
    expect(patches("webhook_deliveries").at(-1)).toMatchObject({ status: "failed", attempts: RETRY_MINUTES.length + 1 });
  });

  it("skips a delivery another run already leased", async () => {
    net = installFakeNet((r) => {
      if (!db(r)) return undefined;
      if (r.method === "GET" && r.table === "webhook_deliveries") {
        return json([{ id: "d1", endpoint_id: "w1", org_id: "o", event_id: "e1", event_type: "post.failed", payload: {}, attempts: 0, next_attempt_at: "2026-01-01T00:00:00Z" }]);
      }
      return json([]); // the lease matched nothing
    });
    expect(await deliverDueWebhooks()).toBe(0);
    expect(postPublic).not.toHaveBeenCalled();
  });
});

describe("post outcome events", () => {
  const outcome = (targets: { status: string; platform_post_id: string | null }[]) => (r: FakeRequest) => {
    if (!db(r)) return undefined;
    if (r.table === "posts" && r.query.includes("select=org_id")) return json({ org_id: "o" });
    if (r.table === "posts") {
      return json({
        id: "p1", body: "hi", thread_tail: [], scheduled_at: null, status: "failed", created_at: "x", media: [],
        post_targets: targets.map((t, i) => ({ channel_id: `c${i}`, variant_body: null, error: null, next_attempt_at: null, metrics: null, channels: { platform: "x", handle: "a" }, ...t })),
      });
    }
    if (r.method === "HEAD") return counted(1);
    if (r.table === "webhook_endpoints") return json([]);
    return json([]);
  };
  const sentType = () => net!.log.find((r) => r.table === "webhook_endpoints" && r.query.includes("events=cs."))?.query.match(/events=cs\.\{([^}]+)\}/)?.[1];

  it("calls a mixed result partial", async () => {
    net = installFakeNet(outcome([{ status: "published", platform_post_id: "1" }, { status: "failed", platform_post_id: null }]));
    await emitPostOutcome("p1", "failed");
    expect(sentType()).toBe("post.partial");
  });

  it("calls a total failure failed", async () => {
    net = installFakeNet(outcome([{ status: "failed", platform_post_id: null }]));
    await emitPostOutcome("p1", "failed");
    expect(sentType()).toBe("post.failed");
  });

  it("sends nothing while a post is still publishing, or when there are no endpoints", async () => {
    net = installFakeNet((r) => (db(r) ? (r.method === "HEAD" ? counted(0) : json({ org_id: "o" })) : undefined));
    await emitPostOutcome("p1", "publishing");
    await emitPostOutcome("p1", "published");
    expect(net.log.some((r) => r.table === "webhook_endpoints" && r.method === "GET")).toBe(false);
  });
});

describe("analytics", () => {
  const rows = [
    { id: "a", body: "A", scheduled_at: "2026-09-10T09:00:00Z", post_targets: [{ channel_id: "x1", status: "published", platform_post_id: "1", metrics: { impressions: 100, likes: 5 }, metrics_updated_at: null, channels: { platform: "x", handle: "acme" } }] },
    { id: "b", body: "B", scheduled_at: "2026-09-12T09:00:00Z", post_targets: [{ channel_id: "l1", status: "published", platform_post_id: "urn:1", metrics: { likes: 20, comments: 2 }, metrics_updated_at: null, channels: { platform: "linkedin", handle: null } }] },
  ];

  it("sorts by a metric and totals the whole range", async () => {
    net = installFakeNet((r) => (db(r) ? json(rows) : undefined));
    const out = await getAnalytics("o", { from: "2026-09-01", to: "2026-09-30", sort: "likes" });
    expect(out.posts.map((p) => p.post_id)).toEqual(["b", "a"]);
    expect(out.totals).toMatchObject({ posts: 2, likes: 25, comments: 2, impressions: 100, engagement: 27 });
    expect(out.posts[1].channels[0].url).toBe("https://x.com/acme/status/1");
    expect(net.log[0].query).toContain("org_id=eq.o");
  });

  it("pages with limit and offset", async () => {
    net = installFakeNet((r) => (db(r) ? json(rows) : undefined));
    const out = await getAnalytics("o", { from: "2026-09-01", to: "2026-09-30", limit: 1 });
    expect(out.posts.map((p) => p.post_id)).toEqual(["b"]);
    expect(out.has_more).toBe(true);
  });

  it("rejects bad ranges and sorts", async () => {
    await expect(getAnalytics("o", { from: "2026-13-01" })).rejects.toThrow(/YYYY-MM-DD/);
    await expect(getAnalytics("o", { from: "2026-09-30", to: "2026-09-01" })).rejects.toThrow(/on or before/);
    await expect(getAnalytics("o", { from: "2024-01-01", to: "2026-01-01" })).rejects.toThrow(/366/);
    await expect(getAnalytics("o", { sort: "followers" })).rejects.toThrow(/sort/);
  });
});
