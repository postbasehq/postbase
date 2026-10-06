import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeNet, json, type FakeRequest } from "./helpers/fake-net";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { refreshChannelTokens, TokenAuthLost, TokenRefreshUnavailable } from "@/lib/platforms/token-refresh";
import { refreshTokens as xRefresh } from "@/lib/platforms/x";
import { publish } from "@/lib/publish/adapters";
import { needsReconnect } from "@/lib/channel-health";

process.env.X_CLIENT_ID = "cid";
process.env.X_CLIENT_SECRET = "secret";

type Tokens = { access_token: string; refresh_token?: string };

let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => {
  net?.restore();
  vi.useRealTimers();
});

/** One channel row in a fake database that honours the refresh lease. */
function fakeChannel(initial: Tokens) {
  const row = { encrypted_tokens: encryptJson(initial), token_expiry: null as string | null, refresh_lock_until: null as string | null };
  let failSaves = 0;
  const db = (r: FakeRequest) => {
    if (r.url.host !== "db.test" || r.table !== "channels") return undefined;
    if (r.method === "GET") return json(r.single ? row : [row]);
    if (r.method === "PATCH") {
      const patch = r.body as Partial<typeof row>;
      if (r.query.includes("or=(refresh_lock_until")) {
        const free = !row.refresh_lock_until || Date.parse(row.refresh_lock_until) < Date.now();
        if (!free) return json([]);
      } else if ("encrypted_tokens" in patch && failSaves > 0) {
        failSaves--;
        return json({ message: "boom" }, 400);
      }
      Object.assign(row, patch);
      return json([row]);
    }
  };
  return { row, db, failNextSaves: (n: number) => void (failSaves = n) };
}

const xToken = (r: FakeRequest) => r.url.pathname.endsWith("/oauth2/token");

describe("channel token refresh", () => {
  it("refreshes, saves the new tokens and releases the lease", async () => {
    const ch = fakeChannel({ access_token: "a1", refresh_token: "r1" });
    const before = ch.row.encrypted_tokens;
    net = installFakeNet((r) => (xToken(r) ? json({ access_token: "a2", refresh_token: "r2", expires_in: 7200 }) : ch.db(r)));
    const { tokens } = await refreshChannelTokens<Tokens>({ channelId: "ch", encrypted: before, refresh: xRefresh, label: "X" });
    expect(tokens).toMatchObject({ access_token: "a2", refresh_token: "r2" });
    expect(decryptJson<Tokens>(ch.row.encrypted_tokens)).toMatchObject({ access_token: "a2", refresh_token: "r2" });
    expect(ch.row.refresh_lock_until).toBeNull();
  });

  it("two refreshes at once spend the single-use refresh token only once", async () => {
    const ch = fakeChannel({ access_token: "a1", refresh_token: "r1" });
    const before = ch.row.encrypted_tokens;
    let spent = 0;
    net = installFakeNet(async (r) => {
      if (xToken(r)) {
        spent++;
        await new Promise((res) => setTimeout(res, 50));
        return spent === 1 ? json({ access_token: "a2", refresh_token: "r2", expires_in: 7200 }) : json({ error: "invalid_request", error_description: "Value passed for the token was invalid." }, 400);
      }
      return ch.db(r);
    });
    const [a, b] = await Promise.all([
      refreshChannelTokens<Tokens>({ channelId: "ch", encrypted: before, refresh: xRefresh, label: "X" }),
      refreshChannelTokens<Tokens>({ channelId: "ch", encrypted: before, refresh: xRefresh, label: "X" }),
    ]);
    expect(spent).toBe(1);
    expect(a.tokens.access_token).toBe("a2");
    expect(b.tokens.access_token).toBe("a2");
  });

  it("a stale caller picks up tokens someone else already refreshed", async () => {
    const ch = fakeChannel({ access_token: "a1", refresh_token: "r1" });
    const stale = ch.row.encrypted_tokens;
    ch.row.encrypted_tokens = encryptJson({ access_token: "a2", refresh_token: "r2" });
    net = installFakeNet((r) => (xToken(r) ? json({ error: "should not refresh" }, 500) : ch.db(r)));
    const { tokens } = await refreshChannelTokens<Tokens>({ channelId: "ch", encrypted: stale, refresh: xRefresh, label: "X" });
    expect(tokens.access_token).toBe("a2");
    expect(net.log.some(xToken)).toBe(false);
  });

  it("a refused refresh token means reconnect", async () => {
    const ch = fakeChannel({ access_token: "a1", refresh_token: "r1" });
    net = installFakeNet((r) => (xToken(r) ? json({ error: "invalid_grant" }, 400) : ch.db(r)));
    const err = await refreshChannelTokens<Tokens>({ channelId: "ch", encrypted: ch.row.encrypted_tokens, refresh: xRefresh, label: "X" }).catch((e) => e);
    expect(err).toBeInstanceOf(TokenAuthLost);
    expect(needsReconnect(err.message)).toBe(true);
    expect(ch.row.refresh_lock_until).toBeNull();
  });

  it("an outage or a garbled reply is temporary, not a reconnect", async () => {
    for (const reply of [
      () => json({ title: "Service Unavailable", detail: "Unauthorized upstream" }, 503),
      () => new Response("<html>bad gateway</html>", { status: 502 }),
      () => new Response("<html>ok?</html>", { status: 200 }),
    ]) {
      net?.restore();
      const ch = fakeChannel({ access_token: "a1", refresh_token: "r1" });
      net = installFakeNet((r) => (xToken(r) ? reply() : ch.db(r)));
      const err = await refreshChannelTokens<Tokens>({ channelId: "ch", encrypted: ch.row.encrypted_tokens, refresh: xRefresh, label: "X" }).catch((e) => e);
      expect(err).toBeInstanceOf(TokenRefreshUnavailable);
      expect(needsReconnect(err.message)).toBe(false);
      expect(ch.row.refresh_lock_until).toBeNull();
    }
  });

  it("retries saving the new tokens (the old refresh token is already spent)", async () => {
    const ch = fakeChannel({ access_token: "a1", refresh_token: "r1" });
    ch.failNextSaves(2);
    net = installFakeNet((r) => (xToken(r) ? json({ access_token: "a2", refresh_token: "r2", expires_in: 7200 }) : ch.db(r)));
    await refreshChannelTokens<Tokens>({ channelId: "ch", encrypted: ch.row.encrypted_tokens, refresh: xRefresh, label: "X" });
    expect(decryptJson<Tokens>(ch.row.encrypted_tokens).refresh_token).toBe("r2");
  });

  it("X publishing: an outage during refresh doesn't flag the channel for reconnect", async () => {
    const ch = fakeChannel({ access_token: "a1", refresh_token: "r1" });
    net = installFakeNet((r) => (xToken(r) ? json({ title: "Service Unavailable" }, 503) : ch.db(r)));
    const res = await publish({
      platform: "x",
      body: "hello",
      threadTail: [],
      media: [],
      channelId: "ch",
      handle: "@me",
      encryptedTokens: ch.row.encrypted_tokens,
      tokenExpiry: new Date(Date.now() - 1000).toISOString(),
    });
    expect(res.ok).toBe(false);
    expect(needsReconnect((res as { error: string }).error)).toBe(false);
  });
});
