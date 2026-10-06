import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json, type FakeRequest } from "./helpers/fake-net";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertPostWhole, replaceTargetsAndMedia } from "@/lib/publish/save-post";

let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => net?.restore());

/** Fake database; `fail` names the table whose insert errors. */
function setup(fail?: "post_targets" | "media", released = true) {
  net = installFakeNet((r: FakeRequest) => {
    if (r.url.host !== "db.test") return undefined;
    if (r.method === "POST" && r.table === fail) return json({ message: `${fail} insert failed` }, 400);
    if (r.table === "posts" && r.method === "POST") return json({ id: "p1" });
    if (r.table === "posts" && r.method === "PATCH") return json(released ? [{ id: "p1" }] : []);
    return json([]);
  });
  return net;
}

const targets = [{ channel_id: "c1" }, { channel_id: "c2", variant_body: "hi" }];
const media = [{ url: "https://pub-test.r2.dev/o/a.png", type: "image/png" }];

describe("saving a post whole", () => {
  it("writes it as a draft and schedules it only after targets and media are in", async () => {
    const n = setup();
    expect(await insertPostWhole(createAdminClient(), { org_id: "o", body: "x" }, "scheduled", targets, media)).toEqual({ id: "p1" });
    const writes = n.log.filter((r) => r.method !== "GET");
    expect(writes.map((r) => `${r.method} ${r.table}`)).toEqual(["POST posts", "POST post_targets", "POST media", "PATCH posts"]);
    expect(writes[0].body).toMatchObject({ status: "draft" });
    expect(writes[1].body).toEqual([
      { post_id: "p1", channel_id: "c1", variant_body: null, status: "scheduled" },
      { post_id: "p1", channel_id: "c2", variant_body: "hi", status: "scheduled" },
    ]);
    expect(writes[3].body).toEqual({ status: "scheduled" });
    expect(writes[3].url.searchParams.get("status")).toBe("eq.draft");
  });

  it("a draft is never switched", async () => {
    const n = setup();
    await insertPostWhole(createAdminClient(), { org_id: "o", body: "x" }, "draft", targets, []);
    expect(n.log.some((r) => r.table === "posts" && r.method === "PATCH")).toBe(false);
  });

  it.each(["post_targets", "media"] as const)("deletes the post when its %s can't be written", async (table) => {
    const n = setup(table);
    await expect(insertPostWhole(createAdminClient(), { org_id: "o", body: "x" }, "scheduled", targets, media)).rejects.toThrow(
      `${table} insert failed`,
    );
    expect(n.log.some((r) => r.table === "posts" && r.method === "PATCH")).toBe(false); // never scheduled
    const del = n.log.find((r) => r.table === "posts" && r.method === "DELETE")!;
    expect(del.url.searchParams.get("id")).toBe("eq.p1");
  });

  it("an edit leaves the post a draft when a write fails", async () => {
    const n = setup("media");
    await expect(replaceTargetsAndMedia(createAdminClient(), "p1", "scheduled", targets, media)).rejects.toThrow();
    expect(n.log.some((r) => r.table === "posts")).toBe(false); // not scheduled, not deleted
  });

  it("an edit schedules the post last, only if it's still held", async () => {
    const n = setup(undefined, false);
    await expect(replaceTargetsAndMedia(createAdminClient(), "p1", "scheduled", targets, media)).rejects.toThrow(/changed while saving/);
    expect(n.log.filter((r) => r.method !== "GET").map((r) => `${r.method} ${r.table}`)).toEqual([
      "DELETE post_targets",
      "DELETE media",
      "POST post_targets",
      "POST media",
      "PATCH posts",
    ]);
  });
});
