import { afterEach, describe, expect, it } from "vitest";
import { installFakeNet, json } from "./helpers/fake-net";
import { shortenLinks, toShortUrl } from "@/lib/bluesky-text";
import { charCount, checkForPlatform } from "@/lib/post-validation";
import { count } from "@/lib/char-count";
import { publish } from "@/lib/publish/adapters";
import { encryptJson } from "@/lib/crypto";

const LONG = "https://example.com/blog/2026/how-to-write-long-posts?utm_source=x#top";

/** The text a facet covers, read back by its UTF-8 byte offsets. */
const covered = (text: string, f: { index: { byteStart: number; byteEnd: number } }) =>
  new TextDecoder().decode(new TextEncoder().encode(text).slice(f.index.byteStart, f.index.byteEnd));

describe("toShortUrl matches the Bluesky app", () => {
  it("drops the scheme and keeps short paths whole", () => {
    expect(toShortUrl("https://example.com")).toBe("example.com");
    expect(toShortUrl("https://example.com/")).toBe("example.com");
    expect(toShortUrl("http://example.com/pricing")).toBe("example.com/pricing");
    expect(toShortUrl("https://example.com/fifteen-chars")).toBe("example.com/fifteen-chars"); // 15: not cut
  });
  it("cuts a path (with query and hash) over 15 characters to 13 plus ...", () => {
    expect(toShortUrl("https://example.com/sixteen-chars!!")).toBe("example.com/sixteen-char...");
    expect(toShortUrl(LONG)).toBe("example.com/blog/2026/ho...");
    expect(toShortUrl("https://example.com/?q=abcdefghijklmnop")).toBe("example.com?q=abcdefghij...") // the app drops a bare "/";
    expect(toShortUrl("https://Example.COM:8080/a")).toBe("example.com:8080/a");
  });
  it("leaves anything that isn't an http(s) URL alone", () => {
    expect(toShortUrl("ftp://example.com/some/very/long/path/here")).toBe("ftp://example.com/some/very/long/path/here");
    expect(toShortUrl("not a url")).toBe("not a url");
  });
});

describe("shortenLinks", () => {
  it("shortens the text and keeps the full URL on the facet", () => {
    const r = shortenLinks(`Read ${LONG} today`);
    expect(r.text).toBe("Read example.com/blog/2026/ho... today");
    expect(r.facets).toHaveLength(1);
    expect(r.facets[0].features[0]).toEqual({ $type: "app.bsky.richtext.facet#link", uri: LONG });
    expect(r.facets[0].index).toEqual({ byteStart: 5, byteEnd: 5 + "example.com/blog/2026/ho...".length });
  });

  it("counts byte offsets on the new text with emoji and multibyte characters", () => {
    const text = `🚀 Café 👍🏽 ${LONG} and ünïcödé 字 https://example.org/a-second-very-long-path 🎉`;
    const r = shortenLinks(text);
    expect(r.text).toBe("🚀 Café 👍🏽 example.com/blog/2026/ho... and ünïcödé 字 example.org/a-second-ver... 🎉");
    // 🚀 4 + space + "Café" 5 + space + 👍🏽 8 + space = 20 bytes before the first link.
    expect(r.facets[0].index.byteStart).toBe(20);
    expect(r.facets.map((f) => covered(r.text, f))).toEqual(["example.com/blog/2026/ho...", "example.org/a-second-ver..."]);
    expect(r.facets.map((f) => f.features[0].uri)).toEqual([LONG, "https://example.org/a-second-very-long-path"]);
  });

  it("leaves trailing punctuation as text, but keeps a closing bracket that belongs to the URL", () => {
    const r = shortenLinks("See https://example.com/x. And (https://en.wikipedia.org/wiki/Mercury_(planet)).");
    expect(r.facets.map((f) => f.features[0].uri)).toEqual([
      "https://example.com/x",
      "https://en.wikipedia.org/wiki/Mercury_(planet)",
    ]);
    expect(r.text).toBe("See example.com/x. And (en.wikipedia.org/wiki/Mercury...).");
    expect(r.facets.map((f) => covered(r.text, f))).toEqual(["example.com/x", "en.wikipedia.org/wiki/Mercury..."]);
  });

  it("leaves text without links untouched", () => {
    expect(shortenLinks("no links here 👋, https:// alone")).toEqual({ text: "no links here 👋, https:// alone", facets: [] });
  });
});

describe("Bluesky counts the shortened text", () => {
  it("a long link costs its short form, not its full length", () => {
    const url = "https://example.com/" + "x".repeat(600);
    expect(charCount("bluesky", `Read ${url}`)).toBe("Read example.com/xxxxxxxxxxxx...".length);
    expect(count(`Read ${url}`, "bluesky")).toBe(charCount("bluesky", `Read ${url}`));
    expect(charCount("bluesky", "👍🏽".repeat(300))).toBe(300);
  });
  it("validation lets through a post that only fits once its link is shortened", () => {
    const text = "a".repeat(260) + " " + LONG; // 331 as typed, 288 as Bluesky shows it
    expect(Array.from(text).length).toBeGreaterThan(300);
    expect(checkForPlatform("bluesky", [text], [])).toEqual([]);
    expect(checkForPlatform("bluesky", ["a".repeat(280) + " " + LONG], [])).toEqual([
      { level: "error", text: "This post is 8 over 300" },
    ]);
  });
});

describe("the Bluesky publisher sends the shortened text", () => {
  let net: ReturnType<typeof installFakeNet> | undefined;
  afterEach(() => net?.restore());

  it("posts short link text with a facet to the full URL, unclipped", async () => {
    const records: { text: string; facets?: { index: { byteStart: number; byteEnd: number }; features: { uri: string }[] }[] }[] = [];
    net = installFakeNet((r) => {
      if (r.url.pathname.includes("createSession")) return json({ accessJwt: "t", did: "did:x" });
      if (r.url.pathname.includes("createRecord")) return records.push((r.body as { record: (typeof records)[number] }).record), json({ uri: "at://x/1", cid: "c" });
    });
    const body = "é".repeat(260) + " " + LONG;
    const res = await publish({
      body,
      threadTail: [],
      media: [],
      channelId: "ch",
      handle: "@me",
      tokenExpiry: new Date(Date.now() + 864e5).toISOString(),
      platform: "bluesky",
      encryptedTokens: encryptJson({ service: "https://pds", identifier: "a", app_password: "b" }),
    });
    expect(res.ok).toBe(true);
    expect(records).toHaveLength(1);
    expect(records[0].text).toBe("é".repeat(260) + " example.com/blog/2026/ho...");
    expect(records[0].facets?.[0].features[0].uri).toBe(LONG);
    expect(records[0].facets?.[0].index.byteStart).toBe(261 * 2 - 1); // é is 2 bytes; the space 1
    expect(covered(records[0].text, records[0].facets![0])).toBe("example.com/blog/2026/ho...");
  });
});
