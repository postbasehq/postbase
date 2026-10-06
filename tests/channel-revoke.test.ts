import { afterEach, describe, expect, it, vi } from "vitest";

// The Mastodon server must resolve to a public address before we call it.
vi.mock("node:dns/promises", () => ({ lookup: async () => [{ address: "151.101.1.1", family: 4 }] }));
import { installFakeNet, counted, json } from "./helpers/fake-net";
import { revokeChannelAccess } from "@/lib/channel-revoke";
import { encryptJson } from "@/lib/crypto";

let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => net?.restore());

const revokes = () => net!.log.filter((r) => r.url.pathname.endsWith("/revoke")).map((r) => `${r.url.host}${r.url.pathname}`);

describe("disconnecting revokes Postbase's access on the network", () => {
  it("Mastodon: revokes the token with its instance app", async () => {
    net = installFakeNet((r) => (r.url.pathname.endsWith("/oauth/revoke") ? json({}) : undefined));
    const enc = encryptJson({ instance: "https://masto.test", access_token: "t", account_id: "1", handle: "@a@masto.test", client_id: "cid", client_secret: "cs" });
    await revokeChannelAccess({ id: "c1", org_id: "o", platform: "mastodon", encrypted_tokens: enc, provider_user_id: null });
    expect(revokes()).toEqual(["masto.test/oauth/revoke"]);
    expect(String(net.log[0].body)).toContain("client_id=cid");
  });
  it("LinkedIn: only when no other channel uses the same member", async () => {
    const enc = encryptJson({ access_token: "t", author_urn: "urn:li:person:m" });
    for (const [others, expected] of [[0, 1], [1, 0]] as const) {
      net?.restore();
      net = installFakeNet((r) => (r.table === "channels" ? counted(others) : r.url.pathname.endsWith("/revoke") ? json({}) : undefined));
      await revokeChannelAccess({ id: "c1", org_id: "o", platform: "linkedin", encrypted_tokens: enc, provider_user_id: "m" });
      expect(revokes()).toHaveLength(expected);
    }
  });
  it("never throws when the network refuses", async () => {
    net = installFakeNet(() => { throw new TypeError("fetch failed"); });
    const enc = encryptJson({ instance: "https://masto.test", access_token: "t", account_id: "1", handle: "h", client_id: "c", client_secret: "s" });
    await expect(revokeChannelAccess({ id: "c1", org_id: "o", platform: "mastodon", encrypted_tokens: enc, provider_user_id: null })).resolves.toBeUndefined();
  });
});
