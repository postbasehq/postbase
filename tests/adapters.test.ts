import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { publish } from "@/lib/publish/adapters";
import { encryptJson } from "@/lib/crypto";

let net: ReturnType<typeof installFakeNet> | undefined;
afterEach(() => net?.restore());
const base = { threadTail: ["part two", "part three"], media: [], channelId: "ch", handle: "@me", tokenExpiry: new Date(Date.now() + 864e5).toISOString() };

describe("retries never post twice", () => {
  it("Bluesky: a thread that fails part-way resumes after the parts already posted", async () => {
    const posted: { text: string; reply?: { root: { uri: string } } }[] = [];
    let failOnce = true;
    net = installFakeNet((r) => {
      if (r.url.pathname.includes("createSession")) return json({ accessJwt: "jwt", did: "did:plc:me" });
      if (r.url.pathname.includes("createRecord")) {
        const rec = (r.body as { record: { text: string } }).record;
        if (rec.text === "part two" && failOnce) {
          failOnce = false;
          return json({ error: "RateLimitExceeded" }, 429);
        }
        posted.push(rec);
        return json({ uri: `at://did:plc:me/app.bsky.feed.post/${posted.length}`, cid: `cid${posted.length}` });
      }
    });
    const enc = encryptJson({ service: "https://pds.test", identifier: "me", app_password: "x" });
    let saved: string[] = [];
    const first = await publish({ ...base, body: "part one", platform: "bluesky", encryptedTokens: enc, onThreadProgress: async (ids) => void (saved = ids) });
    expect(first.ok).toBe(false);
    const retry = await publish({ ...base, body: "part one", platform: "bluesky", encryptedTokens: enc, threadIds: saved, onThreadProgress: async (ids) => void (saved = ids) });
    expect(retry.ok).toBe(true);
    expect(posted.map((p) => p.text)).toEqual(["part one", "part two", "part three"]);
    expect(posted[2].reply?.root.uri).toBe("at://did:plc:me/app.bsky.feed.post/1");
  });

  it("Mastodon: stable idempotency key per part across retries", async () => {
    const keys: string[] = [];
    let failOnce = true;
    net = installFakeNet((r) => {
      if (!r.url.pathname.endsWith("/api/v1/statuses")) return undefined;
      keys.push(`${(r.body as { status: string }).status}|${r.headers.get("idempotency-key")}`);
      if ((r.body as { status: string }).status === "part two" && failOnce) {
        failOnce = false;
        return json({ error: "boom" }, 503);
      }
      return json({ id: `s${keys.length}`, url: "u" });
    });
    const enc = encryptJson({ instance: "https://masto.test", access_token: "t" });
    let saved: string[] = [];
    await publish({ ...base, body: "part one", platform: "mastodon", encryptedTokens: enc, idempotencyKey: "target-1", onThreadProgress: async (ids) => void (saved = ids) });
    await publish({ ...base, body: "part one", platform: "mastodon", encryptedTokens: enc, idempotencyKey: "target-1", threadIds: saved, onThreadProgress: async (ids) => void (saved = ids) });
    expect(keys).toEqual(["part one|target-1:0", "part two|target-1:1", "part two|target-1:1", "part three|target-1:2"]);
  });

  it("YouTube: a lost upload response is checked against the session before any retry", async () => {
    const run = async (session: "complete" | "incomplete" | "unknown") => {
      net?.restore();
      net = installFakeNet((r) => {
        if (r.url.host === "cdn.test") return new Response(new Uint8Array(100));
        if (r.url.search.includes("uploadType=resumable")) return new Response("", { status: 200, headers: { location: "https://upload.test/s" } });
        if (r.url.host === "upload.test") {
          if (r.headers.get("content-range")?.startsWith("bytes */")) {
            return session === "complete" ? json({ id: "vid1" }) : session === "incomplete" ? new Response("", { status: 308 }) : new Response("", { status: 503 });
          }
          throw new TypeError("fetch failed (connection reset)");
        }
      });
      const enc = encryptJson({ access_token: "t", refresh_token: "r", expires_at: Date.now() + 864e5 });
      return publish({ ...base, threadTail: [], body: "video", media: [{ url: "https://cdn.test/v.mp4", type: "video/mp4" }], platform: "youtube", encryptedTokens: enc });
    };
    expect(await run("complete")).toMatchObject({ ok: true, platformPostId: "vid1" });
    // Incomplete: nothing was published, so an ordinary (retryable) failure.
    const incomplete = await run("incomplete");
    expect(incomplete.ok).toBe(false);
    expect((incomplete as { uncertain?: boolean }).uncertain).toBeFalsy();
    expect(await run("unknown")).toMatchObject({ ok: false, uncertain: true });
  });

  it("Bluesky and Mastodon send valid posts untouched (no code-point clipping)", async () => {
    const sent: string[] = [];
    net = installFakeNet((r) => {
      if (r.url.pathname.includes("createSession")) return json({ accessJwt: "t", did: "did:x" });
      if (r.url.pathname.includes("createRecord")) return sent.push((r.body as { record: { text: string } }).record.text), json({ uri: "at://x/1", cid: "c" });
      if (r.url.pathname.endsWith("/api/v1/statuses")) return sent.push((r.body as { status: string }).status), json({ id: "1", url: "u" });
    });
    const emoji = "👍🏽".repeat(300);
    const longUrl = "Read https://example.com/" + "x".repeat(600);
    await publish({ ...base, threadTail: [], body: emoji, platform: "bluesky", encryptedTokens: encryptJson({ service: "https://pds", identifier: "a", app_password: "b" }) });
    await publish({ ...base, threadTail: [], body: longUrl, platform: "mastodon", encryptedTokens: encryptJson({ instance: "https://m", access_token: "t" }) });
    expect(sent).toEqual([emoji, longUrl]);
  });
});
