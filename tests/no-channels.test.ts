import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { createPost } from "@/lib/api-core";

let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => net?.restore());

describe("scheduling needs a channel", () => {
  it("the API refuses a scheduled post with no channels, before writing anything", async () => {
    net = installFakeNet((r) => (r.url.host === "db.test" ? json([]) : undefined));
    const at = new Date(Date.now() + 3_600_000).toISOString();
    await expect(createPost("o", { body: "hi", channelIds: [], scheduledAt: at })).rejects.toThrow(/channel_ids is required/);
    expect(net.writes()).toEqual([]);
  });
  it("a draft can still be saved without channels", async () => {
    net = installFakeNet((r) => (r.url.host === "db.test" ? (r.method === "POST" ? json({ id: "p1" }) : json([])) : undefined));
    await expect(createPost("o", { body: "hi", channelIds: [], scheduledAt: null })).resolves.toMatchObject({ id: "p1", status: "draft" });
  });
});
