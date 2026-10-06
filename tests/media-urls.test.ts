import { afterEach, describe, expect, it } from "vitest";
import { isOwnMediaUrl } from "@/lib/media-urls";
import { fetchMedia } from "@/lib/platforms/fetch-media";
import { installFakeNet } from "./helpers/fake-net";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SB = "https://db.test/storage/v1/object/public/post-media";

describe("a post may only carry the workspace's own stored files", () => {
  it.each([
    [`${SB}/uploads/${ORG}/a.jpg`],
    [`${SB}/ai/${ORG}/a.jpg`],
    [`https://pub-test.r2.dev/${ORG}/v.mp4`],
  ])("allows %s", (url) => expect(isOwnMediaUrl(url, ORG)).toBe(true));

  it.each([
    ["another workspace (post-media)", `${SB}/uploads/${OTHER}/a.jpg`],
    ["another workspace (R2)", `https://pub-test.r2.dev/${OTHER}/v.mp4`],
    ["R2 traversal", `https://pub-test.r2.dev/${ORG}/..%2F${OTHER}%2Fv.mp4`],
    ["plain http", `http://db.test/storage/v1/object/public/post-media/uploads/${ORG}/a.jpg`],
    ["internal address", "https://169.254.169.254/latest/meta-data/"],
    ["arbitrary site", "https://example.com/huge.mp4"],
    ["look-alike host", `https://db.test.evil.com/storage/v1/object/public/post-media/uploads/${ORG}/a.jpg`],
    ["other Supabase path", `https://db.test/storage/v1/object/public/avatars/uploads/${ORG}/a.jpg`],
  ])("refuses %s", (_, url) => expect(isOwnMediaUrl(url, ORG)).toBe(false));
});

describe("media downloads are bounded", () => {
  let net: ReturnType<typeof installFakeNet>;
  afterEach(() => net.restore());

  it("refuses a file whose declared size is over the cap", async () => {
    net = installFakeNet(() => new Response(new Uint8Array(10), { headers: { "content-length": String(200 * 1048576) } }));
    await expect(fetchMedia("https://x/a", { maxBytes: 50 * 1048576 })).rejects.toThrow(/too large/);
  });
  it("stops streaming once a file without a size header passes the cap", async () => {
    const big = new ReadableStream({
      pull(c) {
        c.enqueue(new Uint8Array(1024 * 1024));
      },
    });
    net = installFakeNet(() => new Response(big));
    await expect(fetchMedia("https://x/a", { maxBytes: 5 * 1048576 })).rejects.toThrow(/too large/);
  });
  it("returns the bytes of a normal file", async () => {
    net = installFakeNet(() => new Response(new Uint8Array(1234), { headers: { "content-type": "image/png" } }));
    const r = await fetchMedia("https://x/a", { maxBytes: 5 * 1048576 });
    expect(r.bytes.byteLength).toBe(1234);
    expect(r.type).toBe("image/png");
  });
  it("refuses to follow redirects", async () => {
    let seen: RequestInit | undefined;
    net = installFakeNet(() => undefined);
    net.restore();
    const original = globalThis.fetch;
    globalThis.fetch = (async (_u: RequestInfo | URL, init?: RequestInit) => ((seen = init), new Response(new Uint8Array(1)))) as typeof fetch;
    try {
      await fetchMedia("https://x/a", { maxBytes: 10 });
    } finally {
      globalThis.fetch = original;
    }
    expect(seen?.redirect).toBe("error");
  });
});
