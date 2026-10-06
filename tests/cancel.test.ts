import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json, type FakeRequest } from "./helpers/fake-net";
import { cancelPostForOrg, cancelMessage, holdPostForEdit } from "@/lib/publish/cancel";

const O = "33333333-3333-4333-8333-333333333333";
let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => net?.restore());

function setup(postStatus: string | null, sending = 0) {
  net = installFakeNet((r: FakeRequest) => {
    if (r.url.host !== "db.test") return undefined;
    const q = r.url.searchParams;
    if (r.table === "posts" && r.method === "GET") return postStatus ? json({ status: postStatus }) : json(null);
    if (r.table === "post_targets" && r.method === "GET" && q.get("status") === "eq.publishing") return json(Array.from({ length: sending }, (_, i) => ({ id: `t${i}` })));
    return json([]);
  });
  return net;
}

describe("cancelling a post", () => {
  it("only parks targets that aren't sent or mid-send, scoped to the workspace", async () => {
    const n = setup("publishing");
    expect(await cancelPostForOrg(O, "p1")).toEqual({ ok: true, stillSending: 0 });
    const postWrite = n.log.find((r) => r.table === "posts" && r.method === "PATCH")!;
    expect(postWrite.url.searchParams.get("org_id")).toBe(`eq.${O}`);
    const targetWrite = n.log.find((r) => r.table === "post_targets" && r.method === "PATCH")!;
    expect(targetWrite.url.searchParams.get("status")).toBe("in.(scheduled,failed)");
    expect(targetWrite.url.searchParams.get("platform_post_id")).toBe("is.null");
    expect(targetWrite.body).toMatchObject({ status: "draft", next_attempt_at: null });
  });
  it("says when a channel was already mid-send", async () => {
    setup("publishing", 1);
    const outcome = await cancelPostForOrg(O, "p1");
    expect(outcome).toEqual({ ok: true, stillSending: 1 });
    expect(cancelMessage(outcome)).toMatch(/already being sent/);
  });
  it("a published post can't be turned back into a draft", async () => {
    const n = setup("published");
    expect(await cancelPostForOrg(O, "p1")).toEqual({ ok: false, reason: "published" });
    expect(n.log.some((r) => r.method === "PATCH")).toBe(false);
  });
  it("another workspace's post is not found", async () => {
    const n = setup(null);
    expect(await cancelPostForOrg(O, "p1")).toEqual({ ok: false, reason: "not_found" });
    expect(n.log.some((r) => r.method === "PATCH")).toBe(false);
  });
});

type T = { id: string; status: string; next_attempt_at?: string | null; platform_post_id?: string | null; pending_ref?: string | null };

/** Post status + its targets before the hold; `afterHold` = targets as read once they're parked. */
function setupHold(postStatus: string | null, before: T[], afterHold: T[] = before.map((t) => ({ ...t, status: "draft" })), postHoldWins = true) {
  let targetReads = 0;
  net = installFakeNet((r: FakeRequest) => {
    if (r.url.host !== "db.test") return undefined;
    if (r.table === "posts" && r.method === "GET") return postStatus ? json({ status: postStatus }) : json(null);
    if (r.table === "posts" && r.method === "PATCH") return json(postHoldWins ? [{ id: "p1" }] : []);
    if (r.table === "post_targets" && r.method === "GET") return json(targetReads++ === 0 ? before : afterHold);
    return json([]);
  });
  return net;
}

describe("holding a post while it's edited", () => {
  it("makes the post and its waiting targets unsendable", async () => {
    const n = setupHold("scheduled", [{ id: "t1", status: "scheduled" }]);
    const hold = await holdPostForEdit(O, "p1");
    expect(hold.ok).toBe(true);
    const [holdPost, park] = n.log.filter((r) => r.method === "PATCH");
    expect(n.log.filter((r) => r.method === "PATCH")).toHaveLength(2); // nothing restored
    expect(holdPost.table).toBe("posts");
    expect(holdPost.body).toEqual({ status: "draft" });
    expect(holdPost.url.searchParams.get("org_id")).toBe(`eq.${O}`);
    expect(holdPost.url.searchParams.getAll("status")).toContain("eq.scheduled");
    expect(park.table).toBe("post_targets");
    expect(park.url.searchParams.get("status")).toBe("in.(scheduled,failed)");
    expect(park.url.searchParams.get("pending_ref")).toBe("is.null");
    expect(park.body).toMatchObject({ status: "draft", next_attempt_at: null });
  });

  it("backs off and restores everything when a target was claimed first", async () => {
    const n = setupHold(
      "scheduled",
      [{ id: "t1", status: "scheduled" }, { id: "t2", status: "failed", next_attempt_at: "2026-10-06T10:00:00Z" }],
      [{ id: "t1", status: "publishing" }, { id: "t2", status: "draft" }],
    );
    expect(await holdPostForEdit(O, "p1")).toEqual({ ok: false });
    const writes = n.log.filter((r) => r.method === "PATCH");
    // hold post, park targets, then restore: t1 → scheduled, t2 → failed with its retry time, post → scheduled
    const restoreFailed = writes.find((r) => r.table === "post_targets" && (r.body as { status: string }).status === "failed")!;
    expect(restoreFailed.body).toEqual({ status: "failed", next_attempt_at: "2026-10-06T10:00:00Z" });
    expect(restoreFailed.url.searchParams.get("status")).toBe("eq.draft");
    const restorePost = writes.filter((r) => r.table === "posts").at(-1)!;
    expect(restorePost.body).toEqual({ status: "scheduled" });
    expect(restorePost.url.searchParams.get("status")).toBe("eq.draft");
  });

  it("won't hold a post the publisher already started", async () => {
    const n = setupHold("publishing", []);
    expect(await holdPostForEdit(O, "p1")).toEqual({ ok: false });
    expect(n.log.some((r) => r.method === "PATCH")).toBe(false);
  });

  it("backs off if the publisher starts the post between the read and the hold", async () => {
    const n = setupHold("scheduled", [], [], false);
    expect(await holdPostForEdit(O, "p1")).toEqual({ ok: false });
    expect(n.log.some((r) => r.table === "post_targets")).toBe(false);
  });

  it("treats an upload still processing on the network as sending", async () => {
    const t = { id: "t1", status: "failed", pending_ref: "tiktok-123" };
    expect(await (setupHold("failed", [t], [t]), holdPostForEdit(O, "p1"))).toEqual({ ok: false });
  });

  it("another workspace's post can't be held", async () => {
    const n = setupHold(null, []);
    expect(await holdPostForEdit(O, "p1")).toEqual({ ok: false });
    expect(n.log.some((r) => r.method === "PATCH")).toBe(false);
  });
});
