import { describe, expect, it } from "vitest";
import { cleanTimes, nextRunAfter } from "@/lib/postbots/schedule";
import { parseNewsRss, parseRedditAtom, type RawItem } from "@/lib/postbots/sources";
import { withoutExcluded, listenConfig, pickFindings } from "@/lib/postbots/sweep";
import { buildBotHistory } from "@/lib/postbots/chat";
import type { BotMessage } from "@/lib/postbots/types";

describe("Listen bot schedule", () => {
  it("keeps valid HH:MM times, normalised, sorted and capped at six", () => {
    expect(cleanTimes(["9:05", "25:00", "14:35", "x", "09:05", "8:5"])).toEqual(["09:05", "14:35"]);
    expect(cleanTimes(["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"])).toHaveLength(6);
  });

  it("finds the next check in the bot's timezone", () => {
    const cfg = { times: ["08:34", "17:34"], weekdaysOnly: false, timezone: "Europe/London" };
    // 2026-10-07 10:00 BST → next is 17:34 BST the same day.
    expect(nextRunAfter(cfg, new Date("2026-10-07T09:00:00Z"))).toBe("2026-10-07T16:34:00.000Z");
    // After the last check it rolls to tomorrow's first.
    expect(nextRunAfter(cfg, new Date("2026-10-07T17:00:00Z"))).toBe("2026-10-08T07:34:00.000Z");
  });

  it("skips weekends when told to", () => {
    const cfg = { times: ["09:05"], weekdaysOnly: true, timezone: "UTC" };
    // Friday 2026-10-09 after 09:05 → Monday 2026-10-12.
    expect(nextRunAfter(cfg, new Date("2026-10-09T10:00:00Z"))).toBe("2026-10-12T09:05:00.000Z");
  });

  it("has no next check without times", () => {
    expect(nextRunAfter({ times: [], weekdaysOnly: false, timezone: "UTC" }, new Date())).toBeNull();
  });
});

describe("feed parsing", () => {
  it("reads Google News RSS items", () => {
    const xml = `<rss><channel><item><title>Postbase launches &amp; more</title><link>https://news.example/a</link><guid>g1</guid><pubDate>Tue, 06 Oct 2026 10:00:00 GMT</pubDate><description>&lt;a href="x"&gt;Story&lt;/a&gt;</description><source url="https://ex">Example Times</source></item></channel></rss>`;
    const [item] = parseNewsRss(xml);
    expect(item).toMatchObject({
      source: "news",
      externalId: "g1",
      url: "https://news.example/a",
      title: "Postbase launches & more",
      author: "Example Times",
      text: "Story",
      publishedAt: "2026-10-06T10:00:00.000Z",
    });
  });

  it("reads Reddit Atom entries with their subreddit", () => {
    const xml = `<feed><entry><author><name>/u/someone</name></author><category term="mcp" label="r/mcp"/><content type="html">&lt;p&gt;Anyone tried Postbase?&lt;/p&gt;</content><id>t3_abc</id><link href="https://www.reddit.com/r/mcp/comments/abc/x/" /><updated>2026-10-06T12:00:00+00:00</updated><title>Scheduling posts from Claude</title></entry></feed>`;
    const [item] = parseRedditAtom(xml);
    expect(item).toMatchObject({
      source: "reddit",
      externalId: "t3_abc",
      url: "https://www.reddit.com/r/mcp/comments/abc/x/",
      title: "Scheduling posts from Claude",
      author: "r/mcp",
      text: "Anyone tried Postbase?",
    });
  });
});

describe("sweeps", () => {
  const item = (title: string, text = ""): RawItem => ({
    source: "reddit",
    externalId: title,
    url: `https://r/${title}`,
    title,
    text,
    author: null,
    publishedAt: null,
  });

  it("drops namesakes before they reach the model", () => {
    const items = [item("PostBase, a Supabase alternative"), item("Postbase scheduled my week"), item("x", "made with post-base.io")];
    expect(withoutExcluded(items, ["supabase alternative", "post-base.io"]).map((i) => i.title)).toEqual(["Postbase scheduled my week"]);
  });

  it("only sweeps once there's something to look for and somewhere to look", () => {
    expect(listenConfig({ keywords: ["Postbase"], sources: [] })).toBeNull();
    expect(listenConfig({ keywords: [], sources: ["reddit"] })).toBeNull();
    expect(listenConfig({ keywords: [" Postbase "], sources: ["reddit", "myspace"] })).toMatchObject({
      keywords: ["Postbase"],
      sources: ["reddit"],
    });
  });
});

describe("bot chat history", () => {
  const msg = (role: "user" | "bot", content: string, extra: Partial<BotMessage> = {}): BotMessage => ({
    id: Math.random().toString(),
    role,
    content,
    cards: [],
    createdAt: "",
    ...extra,
  });

  it("opens with a user turn and turns cards into notes the model can read", () => {
    const history = buildBotHistory([
      msg("bot", "Hi, what should I listen for?", {
        cards: [{ type: "question", question: "What should I listen for?", options: ["My company", "Competitors"], multiSelect: true }],
      }),
      msg("user", "My company"),
    ]);
    expect(history[0]).toEqual({ role: "user", content: "(I just made you.)" });
    expect(history[1].role).toBe("assistant");
    expect(String(history[1].content)).toContain("[Asked: What should I listen for? Options: My company / Competitors]");
    expect(history[2]).toEqual({ role: "user", content: "My company" });
  });
});

describe("sweep findings", () => {
  const raw = (n: number): RawItem => ({ source: "bluesky", externalId: `${n}`, url: `https://b/${n}`, title: `t${n}`, text: "", author: null, publishedAt: null });
  const verdict = (index: number, score: number) => ({ index, score, relevant: score >= 4, kind: "conversation" as const, action: "reply" as const, why: "w" });

  it("shows only 4s and 5s, best first, at most five", () => {
    const items = Array.from({ length: 9 }, (_, i) => raw(i));
    const t = { summary: "", items: [verdict(0, 3), verdict(1, 4), verdict(2, 5), verdict(3, 4), verdict(4, 4), verdict(5, 5), verdict(6, 4), verdict(7, 2), verdict(8, 4)] };
    const picked = pickFindings(t, items);
    expect(picked).toHaveLength(5);
    expect(picked.slice(0, 2).map((f) => f.title)).toEqual(["t2", "t5"]);
    expect(picked.map((f) => f.title)).not.toContain("t0");
  });

  it("ignores a generous 'relevant' flag and indexes that don't exist", () => {
    const t = { summary: "", items: [{ ...verdict(0, 3), relevant: true }, verdict(5, 5)] };
    expect(pickFindings(t, [raw(0)])).toEqual([]);
  });
});
