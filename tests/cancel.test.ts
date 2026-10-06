import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json, type FakeRequest } from "./helpers/fake-net";
import { cancelPostForOrg, cancelMessage } from "@/lib/publish/cancel";

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
