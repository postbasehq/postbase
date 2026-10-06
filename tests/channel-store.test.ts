import { afterEach, describe, expect, it } from "vitest";
import { counted, installFakeNet, json } from "./helpers/fake-net";
import { saveChannel } from "@/lib/channel-store";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let net: ReturnType<typeof installFakeNet>;
afterEach(() => net.restore());

function world(opts: { existing: boolean; channels: number }) {
  net = installFakeNet((r) => {
    if (r.table === "channels" && r.method === "GET") return opts.existing ? (r.single ? json({ id: "ch1" }) : json([{ id: "ch1" }])) : r.single ? json(null) : json([]);
    if (r.table === "channels" && r.method === "HEAD") return counted(opts.channels);
    if (r.table === "orgs") {
      const org = { id: ORG, name: "A", billing_org_id: null, plan: "creator", subscription_status: "active", comped: false };
      return r.single ? json(org) : json(r.query.includes("billing_org_id") ? [] : [org]);
    }
    return json([]);
  });
}

describe("channels are saved server-side, scoped to the workspace", () => {
  it("a reconnect updates the existing row, only within the caller's workspace", async () => {
    world({ existing: true, channels: 5 });
    expect(await saveChannel(ORG, "x", "@me", { status: "active" })).toEqual({ error: null, limit: false });
    expect(net.writes()).toEqual([`PATCH channels ?id=eq.ch1&org_id=eq.${ORG}`]);
  });
  it("a new channel is inserted into the caller's workspace", async () => {
    world({ existing: false, channels: 1 });
    await saveChannel(ORG, "x", "@new", { status: "active" });
    const insert = net.log.find((r) => r.table === "channels" && r.method === "POST");
    expect(insert?.body).toMatchObject({ org_id: ORG, platform: "x", handle: "@new" });
  });
  it("a new channel past the plan's limit is refused, and nothing is written", async () => {
    world({ existing: false, channels: 5 });
    expect(await saveChannel(ORG, "x", "@sixth", { status: "active" })).toEqual({ error: null, limit: true });
    expect(net.writes()).toEqual([]);
  });
});
