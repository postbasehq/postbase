import { describe, expect, it } from "vitest";
import { charCount, checkForPlatform, firstBlockingProblem, NOTHING_TO_POST, pastTimeProblem, tiktokSettingsProblem } from "@/lib/post-validation";

const img = (n: number, type = "image/jpeg") => Array.from({ length: n }, () => ({ type }));
const vid = [{ type: "video/mp4" }];
const texts = (platform: string, parts: string[], media: { type: string }[] = []) =>
  checkForPlatform(platform, parts, media).map((c) => `${c.level}: ${c.text}`);

describe("character counting, the way each network counts", () => {
  it("X counts any URL as 23 and emoji/CJK as 2", () => {
    expect(charCount("x", "https://example.com/" + "a".repeat(500))).toBe(23);
    expect(charCount("x", "🚀".repeat(140))).toBe(280);
    expect(charCount("x", "字".repeat(141))).toBe(282);
  });
  it("Bluesky counts graphemes, so skin-tone emoji count once", () => {
    expect(charCount("bluesky", "👍🏽".repeat(300))).toBe(300);
  });
  it("Mastodon counts URLs as 23", () => {
    expect(charCount("mastodon", "Read https://example.com/" + "x".repeat(600))).toBe(5 + 23);
  });
});

describe("network rules", () => {
  it("blocks what X would reject", () => {
    expect(texts("x", ["hi"], img(5))).toEqual(["error: X allows up to 4 images"]);
    expect(texts("x", ["hi"], [...vid, ...img(1)])).toEqual(["error: X can't mix a video with other media"]);
    expect(texts("x", ["hi"], [...img(1, "image/gif"), ...img(1)])).toEqual(["error: X can't mix a GIF with other media"]);
    expect(texts("x", ["字".repeat(141)])).toEqual(["error: This post is 2 over 280"]);
    expect(texts("x", ["hi"], img(4))).toEqual([]);
  });
  it("says out loud what a network will quietly drop", () => {
    expect(texts("bluesky", ["hi"], [...vid, ...img(5)])).toEqual([
      "info: Videos aren't posted to Bluesky, only the images",
      "info: Only the first 4 images are posted",
    ]);
    expect(texts("linkedin", ["hi"], vid)).toEqual(["info: Videos aren't posted to LinkedIn"]);
    expect(texts("instagram", ["hi"], img(12))).toEqual(["info: Only the first 10 images are posted"]);
  });
  it("requires media where the network does", () => {
    expect(texts("instagram", ["hi"])).toEqual(["error: Needs an image or video"]);
    expect(texts("tiktok", ["hi"])).toEqual(["error: Needs a video or images"]);
    expect(texts("youtube", ["hi"], img(1))).toEqual(["error: Needs a video"]);
  });
  it("names the first blocking problem across channels", () => {
    expect(firstBlockingProblem([{ platform: "linkedin", parts: ["ok"] }, { platform: "x", parts: ["ok"] }], img(5))).toBe(
      "X: X allows up to 4 images.",
    );
    expect(firstBlockingProblem([{ platform: "tiktok", parts: ["api post"] }], [])).toBe("TikTok: Needs a video or images.");
  });
});

describe("scheduled time", () => {
  it("refuses times more than 5 minutes in the past", () => {
    expect(pastTimeProblem(new Date(Date.now() - 10 * 60_000).toISOString())).toMatch(/in the past/);
    expect(pastTimeProblem(new Date(Date.now() - 2 * 60_000).toISOString())).toBeNull();
    expect(pastTimeProblem("not a date")).toMatch(/isn't valid/);
  });
});

describe("hostile input stays cheap", () => {
  it("rejects absurdly long or many-part posts without slow counting", () => {
    const t = performance.now();
    expect(texts("x", ["a-b.".repeat(20_000)])[0]).toMatch(/Far over/);
    expect(texts("x", Array(26).fill("hi"))[0]).toMatch(/up to 25 posts/);
    firstBlockingProblem(Array.from({ length: 100 }, () => ({ platform: "x", parts: Array(25).fill("a-b.".repeat(1000)) })), []);
    expect(performance.now() - t).toBeLessThan(3000);
  });
  it("still counts a genuine long URL on X", () => {
    expect(texts("x", ["Read https://example.com/" + "a".repeat(2000)])).toEqual([]);
  });
});

describe("TikTok settings are re-checked on the server", () => {
  it("the user has to choose who sees the post", () => {
    expect(tiktokSettingsProblem(null, null)).toMatch(/Choose who can see/);
    expect(tiktokSettingsProblem("PUBLIC_TO_EVERYONE", { brandedContent: false })).toBeNull();
  });
  it("branded content can't be private, including when posts are forced private", () => {
    expect(tiktokSettingsProblem("SELF_ONLY", { brandedContent: true })).toMatch(/can't be private/);
    expect(tiktokSettingsProblem("PUBLIC_TO_EVERYONE", { brandedContent: true })).toBeNull();
    expect(tiktokSettingsProblem("PUBLIC_TO_EVERYONE", { brandedContent: true }, "SELF_ONLY")).toMatch(/private for now/);
    expect(tiktokSettingsProblem("SELF_ONLY", { brandedContent: false }, "SELF_ONLY")).toBeNull();
  });
});

describe("media on its own is a post", () => {
  it("is fine everywhere but LinkedIn, which needs text", () => {
    for (const p of ["x", "bluesky", "mastodon", "facebook", "instagram", "tiktok"]) {
      expect(texts(p, [], img(1)).filter((t) => t.startsWith("error"))).toEqual([]);
    }
    expect(texts("linkedin", [], img(1))).toContain("error: LinkedIn posts need text");
  });
  it("no text and no media is nothing to post", () => {
    expect(texts("x", [], [])).toEqual([`error: ${NOTHING_TO_POST}`]);
    expect(texts("x", ["  "], [])).toEqual([`error: ${NOTHING_TO_POST}`]);
  });
});
