import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { refreshTokens, REFRESH_REPLAY_GRACE_SECONDS } from "@/lib/oauth";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "11111111-1111-4111-8111-111111111111";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

let net: ReturnType<typeof installFakeNet>;
afterEach(() => net.restore());

/** A database where `live` is the one live refresh token and `spent` was used `spentAgo` seconds ago. */
function db(opts: { live?: string; spent?: string; spentAgo?: number }) {
  net = installFakeNet((r) => {
    if (r.url.host !== "db.test") return json({});
    const q = decodeURIComponent(r.query);
    if (r.table === "oauth_tokens" && r.method === "GET") {
      const row = opts.live && q.includes(hash(opts.live))
        ? { id: "t1", client_id: "mcpc_1", org_id: ORG, user_id: USER, scope: "mcp", created_at: new Date().toISOString() }
        : null;
      return json(row);
    }
    if (r.table === "oauth_spent_refresh" && r.method === "GET") {
      const row = opts.spent && q.includes(hash(opts.spent))
        ? { client_id: "mcpc_1", org_id: ORG, user_id: USER, spent_at: new Date(Date.now() - (opts.spentAgo ?? 0) * 1000).toISOString() }
        : null;
      return json(row);
    }
    if (r.table === "org_members") return json({ role: "owner" });
    if (r.table === "oauth_tokens" && r.method === "DELETE") return json([{ id: "t1" }]);
    return json([]);
  });
}
const writes = () => net.writes().map((w) => w.replace(ORG, "ORG").replace(USER, "USER"));

describe("MCP refresh tokens", () => {
  it("rotates a live token and records it as spent", async () => {
    db({ live: "pbr_live" });
    const out = await refreshTokens("pbr_live", "mcpc_1");
    expect(out?.expires_in).toBe(24 * 3600);
    expect(writes()).toEqual(expect.arrayContaining(["DELETE oauth_tokens ?id=eq.t1&select=id", "POST oauth_spent_refresh ", "POST oauth_tokens "]));
  });

  it("revokes the connection when a spent token is replayed later", async () => {
    db({ spent: "pbr_old", spentAgo: REFRESH_REPLAY_GRACE_SECONDS + 60 });
    expect(await refreshTokens("pbr_old", "mcpc_1")).toBeNull();
    expect(writes()).toContain("DELETE oauth_tokens ?client_id=eq.mcpc_1&org_id=eq.ORG&user_id=eq.USER");
  });

  it("refuses, but revokes nothing, for a quick retry or an unknown token", async () => {
    db({ spent: "pbr_old", spentAgo: 5 });
    expect(await refreshTokens("pbr_old", "mcpc_1")).toBeNull();
    expect(await refreshTokens("pbr_never_issued", "mcpc_1")).toBeNull();
    expect(writes().filter((w) => w.startsWith("DELETE"))).toEqual([]);
  });
});
