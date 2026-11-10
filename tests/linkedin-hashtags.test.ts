import { describe, expect, it } from "vitest";
import { escapeCommentary, linkedInSegments } from "@/lib/platforms/linkedin";

const tag = (t: string) => `{hashtag|\\#|${t}}`;

describe("LinkedIn commentary: hashtags post as real hashtags", () => {
  it("turns a plain hashtag into the hashtag template", () => {
    expect(escapeCommentary("Big news #marketing")).toBe(`Big news ${tag("marketing")}`);
  });

  it("handles several hashtags, including back to back", () => {
    expect(escapeCommentary("#ai #ml, #data!")).toBe(`${tag("ai")} ${tag("ml")}, ${tag("data")}!`);
  });

  it("keeps CamelCase as typed", () => {
    expect(escapeCommentary("#SocialMediaTips")).toBe(tag("SocialMediaTips"));
  });

  it("allows Unicode letters and combining marks", () => {
    expect(escapeCommentary("#café #日本 #हिन्दी")).toBe(`${tag("café")} ${tag("日本")} ${tag("हिन्दी")}`);
  });

  it("accepts the full-width sign", () => {
    expect(escapeCommentary("＃launch")).toBe("{hashtag|＃|launch}");
  });

  it("works at the start of a line and after opening punctuation", () => {
    expect(escapeCommentary("Intro\n#first\n(#second)")).toBe(`Intro\n${tag("first")}\n\\(${tag("second")}\\)`);
  });

  it("escapes reserved characters inside the tag", () => {
    expect(escapeCommentary("#snake_case")).toBe(tag("snake\\_case"));
  });

  it("allows digits alongside letters", () => {
    expect(escapeCommentary("#web3 #2026goals")).toBe(`${tag("web3")} ${tag("2026goals")}`);
  });
});

describe("LinkedIn commentary: everything else still posts literally", () => {
  it("leaves URL fragments alone, with or without a scheme", () => {
    expect(escapeCommentary("https://example.com/page#section")).toBe("https://example.com/page\\#section");
    expect(escapeCommentary("example.com/page#section")).toBe("example.com/page\\#section");
    expect(escapeCommentary("https://example.com/#top")).toBe("https://example.com/\\#top");
    expect(escapeCommentary("www.example.com/docs#install_guide")).toBe("www.example.com/docs\\#install\\_guide");
  });

  it("keeps C#, F# and HTML entities literal", () => {
    expect(escapeCommentary("Hiring C# and F# devs")).toBe("Hiring C\\# and F\\# devs");
    expect(escapeCommentary("&#38;")).toBe("&\\#38;");
  });

  it("keeps number-only tags literal", () => {
    expect(escapeCommentary("We're #1")).toBe("We're \\#1");
    expect(escapeCommentary("#2026")).toBe("\\#2026");
  });

  it("keeps a lone or doubled # literal", () => {
    expect(escapeCommentary("# heading")).toBe("\\# heading");
    expect(escapeCommentary("end #")).toBe("end \\#");
    expect(escapeCommentary("##double")).toBe("\\#\\#double");
  });

  it("still escapes every other reserved character", () => {
    expect(escapeCommentary("@Jane * (a) [b] {c} <d> ~e| f\\g _h")).toBe(
      "\\@Jane \\* \\(a\\) \\[b\\] \\{c\\} \\<d\\> \\~e\\| f\\\\g \\_h",
    );
  });

  it("mixes hashtags with escaped text", () => {
    expect(escapeCommentary("Ship it* #DevOps @team")).toBe(`Ship it\\* ${tag("DevOps")} \\@team`);
  });
});

describe("linkedInSegments (shared with the composer preview)", () => {
  it("splits text, links and hashtags", () => {
    expect(linkedInSegments("Read https://x.com/a#b #news")).toEqual([
      { kind: "text", text: "Read " },
      { kind: "link", text: "https://x.com/a#b" },
      { kind: "text", text: " " },
      { kind: "hashtag", text: "#news", sign: "#", tag: "news" },
    ]);
  });

  it("reassembles to the original text", () => {
    const text = "C# #1 #ok (#yes) example.com/#no ＃wide";
    expect(linkedInSegments(text).map((s) => s.text).join("")).toBe(text);
  });
});
