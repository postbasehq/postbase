/*
 * Character counting the way each network does it, for the free counter at
 * /tools/character-counter. X follows twitter-text's weighted rules (v3 config);
 * Bluesky counts graphemes; Mastodon counts URLs as 23 and remote mentions by
 * their local part. Others count Unicode code points.
 */

export type CountRule = "x" | "graphemes" | "mastodon" | "codepoints";

export type NetworkLimit = { id: string; name: string; limit: number; rule: CountRule; what: string };

export const LIMITS: NetworkLimit[] = [
  { id: "x", name: "X", limit: 280, rule: "x", what: "per post" },
  { id: "bluesky", name: "Bluesky", limit: 300, rule: "graphemes", what: "per post" },
  { id: "threads", name: "Threads", limit: 500, rule: "codepoints", what: "per post" },
  { id: "mastodon", name: "Mastodon", limit: 500, rule: "mastodon", what: "per post (default)" },
  { id: "linkedin", name: "LinkedIn", limit: 3000, rule: "codepoints", what: "per post" },
  { id: "instagram", name: "Instagram", limit: 2200, rule: "codepoints", what: "caption" },
  { id: "tiktok", name: "TikTok", limit: 2200, rule: "codepoints", what: "caption" },
  { id: "youtube", name: "YouTube", limit: 100, rule: "codepoints", what: "title" },
];

const URL_RE =
  /\b(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|co|ai|so|dev|app|me|uk|us|xyz|gg|tv|ly)(?:\/[^\s]*)?)/gi;

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;

function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

// twitter-text v3: code points in these ranges weigh 1; everything else 2.
const LIGHT: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];
const weightOf = (cp: number) => (LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2);
const EMOJI = /\p{Extended_Pictographic}/u;

function countX(text: string): number {
  const t = text.normalize("NFC");
  let total = 0;
  let last = 0;
  for (const m of t.matchAll(URL_RE)) {
    total += weighted(t.slice(last, m.index)) + 23;
    last = (m.index ?? 0) + m[0].length;
  }
  return total + weighted(t.slice(last));
}

function weighted(text: string): number {
  let n = 0;
  for (const g of graphemes(text)) {
    if (EMOJI.test(g)) n += 2; // an emoji sequence counts once, as 2
    else for (const ch of g) n += weightOf(ch.codePointAt(0)!);
  }
  return n;
}

function countMastodon(text: string): number {
  const t = text
    .replace(/https?:\/\/[^\s]+/g, "x".repeat(23))
    .replace(/@([a-z0-9_]+)@[a-z0-9.-]+\.[a-z]+/gi, "@$1");
  return Array.from(t).length;
}

export function count(text: string, rule: CountRule): number {
  switch (rule) {
    case "x":
      return countX(text);
    case "graphemes":
      return graphemes(text).length;
    case "mastodon":
      return countMastodon(text);
    default:
      return Array.from(text).length;
  }
}

/**
 * Split text into posts that each fit `limit` under `rule`: by paragraph, then
 * sentence, then word. With `numbered`, each post ends " 1/n" (and the
 * numbering is counted).
 */
export function splitThread(text: string, limit: number, rule: CountRule, numbered: boolean): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Reserve room for " 12/12" when numbering.
  const room = numbered ? limit - 6 : limit;
  const fits = (s: string) => count(s, rule) <= room;

  // Break into pieces that fit, remembering which ones start a paragraph.
  const pieces: { text: string; para: boolean }[] = [];
  for (const para of trimmed.split(/\n{2,}/)) {
    let first = true;
    const push = (t: string) => {
      pieces.push({ text: t, para: first });
      first = false;
    };
    if (fits(para)) {
      push(para);
      continue;
    }
    // A sentence ends at . ! or ? followed by whitespace, so URLs stay whole.
    for (const sentence of para.split(/(?<=[.!?]["')\]]*)\s+/)) {
      const s = sentence.trim();
      if (fits(s)) {
        push(s);
        continue;
      }
      let cur = "";
      for (const word of s.split(/\s+/)) {
        const next = cur ? `${cur} ${word}` : word;
        if (fits(next)) cur = next;
        else {
          if (cur) push(cur);
          cur = word; // a single over-long word stays whole
        }
      }
      if (cur) push(cur);
    }
  }

  // Pack pieces greedily into posts; a new paragraph joins with a blank line.
  const posts: string[] = [];
  let cur = "";
  for (const p of pieces) {
    const next = cur ? `${cur}${p.para ? "\n\n" : " "}${p.text}` : p.text;
    if (fits(next)) cur = next;
    else {
      if (cur) posts.push(cur);
      cur = p.text;
    }
  }
  if (cur) posts.push(cur);

  return numbered && posts.length > 1 ? posts.map((p, i) => `${p} ${i + 1}/${posts.length}`) : posts;
}
