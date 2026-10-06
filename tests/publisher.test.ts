import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeNet, json, type FakeRequest } from "./helpers/fake-net";
import { publishDuePosts } from "@/lib/publish/run";

const P = "11111111-1111-4111-8111-111111111111";
const T = "22222222-2222-4222-8222-222222222222";
const O = "33333333-3333-4333-8333-333333333333";
let org: Record<string, unknown>;
let fail: Set<string>;
let failRecompute: boolean;
let channelOrg: string;
let mediaRows: { storage_url: string; type: string }[];
let postStatus: string;
let net: ReturnType<typeof installFakeNet>;

function db(r: FakeRequest) {
  if (r.url.host !== "db.test") return undefined;
  const q = r.url.searchParams;
  const rows = (x: unknown[]) => (r.single ? (x.length ? json(x[0]) : json({ code: "PGRST116" }, 406)) : json(x));
  if (fail.has(r.table) && r.method === "GET") return json({ code: "08006", message: "connection reset (injected)" }, 400);
  if (r.table === "posts" && r.method === "PATCH" && q.get("status") === "eq.scheduled") return json([{ id: P }]);
  if (r.table === "posts" && r.method === "GET" && q.get("id") === `eq.${P}`) return rows([{ id: P, org_id: O, status: postStatus, body: "hello", thread_tail: [] }]);
  if (r.table === "post_targets" && r.method === "GET" && q.get("status") === "eq.scheduled") return json([{ id: T, post_id: P, posts: { status: "publishing" } }]);
  if (r.table === "post_targets" && r.method === "PATCH" && q.get("id") === `eq.${T}`) return json([{ id: T }]);
  if (r.table === "post_targets" && r.method === "GET" && q.get("id") === `eq.${T}`) {
    return rows([{ id: T, status: "publishing", platform_post_id: null, variant_body: null, attempts: 0, pending_ref: null, pending_since: null, thread_ids: null, channels: { id: "c", org_id: channelOrg, platform: "bluesky", handle: "@x", encrypted_tokens: null, token_expiry: null } }]);
  }
  if (r.table === "post_targets" && r.method === "GET" && q.get("post_id") === `eq.${P}`) {
    return failRecompute ? json({ code: "08006", message: "boom" }, 400) : json([{ status: "scheduled", next_attempt_at: null, platform_post_id: null }]);
  }
  if (r.table === "media" && r.method === "GET") return json(mediaRows);
  if (r.table === "orgs" && q.get("id") === `eq.${O}`) return rows([org]);
  return json([]);
}

beforeEach(() => {
  process.env.FORCE_BILLING = "1";
  org = { id: O, name: "Acme", billing_org_id: null, plan: "creator", subscription_status: "active", comped: false };
  fail = new Set();
  failRecompute = false;
  channelOrg = O;
  mediaRows = [];
  postStatus = "publishing";
  net = installFakeNet(db);
});
afterEach(() => {
  net.restore();
  delete process.env.FORCE_BILLING;
});

const targetWrites = () => net.log.filter((r) => r.method === "PATCH" && r.table === "post_targets" && r.query.includes(T)).map((r) => r.body as Record<string, unknown>);

describe("the publisher never turns a database blip into a failed post", () => {
  it("a failed billing read puts the target back for the next run", async () => {
    fail.add("orgs");
    await publishDuePosts();
    const w = targetWrites();
    expect(w.at(-1)).toMatchObject({ status: "scheduled", claimed_at: null });
    expect(w.some((b) => b.status === "failed")).toBe(false);
  });
  it("a failed media read never sends the post without its media", async () => {
    fail.add("media");
    await publishDuePosts();
    expect(targetWrites().at(-1)).toMatchObject({ status: "scheduled", claimed_at: null });
  });
  it("a workspace with genuinely no plan still fails", async () => {
    org.subscription_status = null;
    await publishDuePosts();
    expect(targetWrites().at(-1)).toMatchObject({ status: "failed" });
    expect(String(targetWrites().at(-1)?.error)).toMatch(/no active plan/);
  });
  it("a failed status roll-up doesn't mark the post published", async () => {
    fail.add("orgs");
    failRecompute = true;
    await publishDuePosts();
    const postWrites = net.log.filter((r) => r.method === "PATCH" && r.table === "posts" && r.query.includes(`id=eq.${P}`));
    expect(postWrites).toHaveLength(0);
  });
  it("never sends through a channel from another workspace", async () => {
    channelOrg = "44444444-4444-4444-8444-444444444444";
    await publishDuePosts();
    expect(targetWrites().at(-1)).toMatchObject({ status: "failed", error: "This channel doesn't belong to the post's workspace." });
  });
  it("never downloads media that isn't the workspace's own", async () => {
    mediaRows = [{ storage_url: "https://169.254.169.254/latest/meta-data/", type: "image/png" }];
    await publishDuePosts();
    expect(targetWrites().at(-1)).toMatchObject({ status: "failed" });
    expect(String(targetWrites().at(-1)?.error)).toMatch(/isn't stored in this workspace/);
    expect(net.log.some((r) => r.url.host === "169.254.169.254")).toBe(false);
  });
});

describe("a cancelled post stays cancelled", () => {
  it("a target claimed just as its post was cancelled is parked, not sent", async () => {
    postStatus = "draft";
    await publishDuePosts();
    expect(targetWrites().at(-1)).toMatchObject({ status: "draft", next_attempt_at: null });
    expect(net.log.some((r) => r.url.host !== "db.test")).toBe(false);
  });
  it("retries of cancelled (draft) posts are never queued", async () => {
    await publishDuePosts();
    const retryRead = net.log.find((r) => r.table === "post_targets" && r.method === "GET" && r.url.searchParams.get("status") === "eq.failed");
    expect(retryRead?.url.searchParams.get("posts.status")).toBe("neq.draft");
  });
});
