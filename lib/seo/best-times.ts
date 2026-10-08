import { localDateKey, zonedTimeToUtc } from "@/lib/tz-core";

/*
 * Starting-point posting times per network for /tools/best-time-to-post.
 * Each network has a weight per weekday and per two-hour block, in the
 * audience's local time, shaped on the patterns that repeat across the large
 * published studies (Sprout Social, Hootsuite, Buffer, Later). A cell's score
 * is day × block, nudged by audience; the page shows the ranking, never the
 * raw numbers, because the studies disagree on detail and agree on shape.
 */

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
/** Start hour of each two-hour block, 6am to midnight. */
export const BLOCKS = [6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

export type Audience = "everyone" | "b2b" | "b2c";
export const AUDIENCES: { id: Audience; label: string }[] = [
  { id: "everyone", label: "Everyone" },
  { id: "b2b", label: "Businesses" },
  { id: "b2c", label: "Consumers" },
];

export type NetworkTimes = {
  id: string;
  name: string;
  days: number[];
  blocks: number[];
  /** One line of advice specific to the network. */
  tip: string;
};

export const NETWORK_TIMES: NetworkTimes[] = [
  {
    id: "instagram",
    name: "Instagram",
    days: [0.85, 1, 1, 0.95, 0.85, 0.6, 0.55],
    blocks: [0.4, 0.75, 1, 0.95, 0.8, 0.7, 0.75, 0.65, 0.35],
    tip: "Reels keep finding viewers for days, so timing matters most for feed posts and Stories.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    days: [0.8, 0.95, 0.95, 1, 0.9, 0.75, 0.7],
    blocks: [0.25, 0.4, 0.55, 0.75, 0.85, 0.9, 1, 0.95, 0.6],
    tip: "TikTok shows videos to a small test audience first, so post when your followers are scrolling: afternoons and evenings.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    days: [0.85, 1, 1, 0.95, 0.7, 0.2, 0.2],
    blocks: [0.45, 1, 0.95, 0.85, 0.65, 0.5, 0.3, 0.2, 0.1],
    tip: "People read LinkedIn at work: before the first meeting and around lunch. Weekends are quiet.",
  },
  {
    id: "x",
    name: "X",
    days: [0.9, 1, 1, 0.95, 0.8, 0.5, 0.45],
    blocks: [0.5, 0.9, 1, 0.9, 0.7, 0.6, 0.55, 0.45, 0.3],
    tip: "Posts on X fade within hours. Post when your followers are online, and reply to the first comments quickly.",
  },
  {
    id: "facebook",
    name: "Facebook",
    days: [0.9, 1, 1, 0.95, 0.85, 0.55, 0.5],
    blocks: [0.45, 0.85, 1, 0.95, 0.75, 0.6, 0.55, 0.45, 0.25],
    tip: "Weekday mornings work for most Pages. Local businesses often do better at lunch and early evening.",
  },
  {
    id: "youtube",
    name: "YouTube",
    days: [0.7, 0.7, 0.8, 0.9, 1, 0.95, 0.85],
    blocks: [0.2, 0.35, 0.55, 0.8, 1, 0.95, 0.75, 0.55, 0.3],
    tip: "Publish two or three hours before evening viewing so the video is indexed and suggested by the time people sit down.",
  },
  {
    id: "threads",
    name: "Threads",
    days: [0.9, 1, 1, 0.95, 0.85, 0.6, 0.55],
    blocks: [0.6, 1, 0.9, 0.85, 0.7, 0.6, 0.65, 0.55, 0.3],
    tip: "Threads is busiest early: people check it with their morning coffee.",
  },
  {
    id: "bluesky",
    name: "Bluesky",
    days: [0.95, 1, 1, 0.95, 0.8, 0.5, 0.5],
    blocks: [0.5, 0.9, 1, 0.9, 0.8, 0.65, 0.6, 0.55, 0.35],
    tip: "Bluesky's following feed is in time order, so a post is seen by whoever is online when it goes out.",
  },
  {
    id: "mastodon",
    name: "Mastodon",
    days: [0.95, 1, 1, 0.95, 0.85, 0.6, 0.55],
    blocks: [0.5, 0.85, 1, 0.9, 0.75, 0.6, 0.6, 0.5, 0.3],
    tip: "Mastodon has no algorithm: timelines are in time order, so post when your followers are awake.",
  },
];

const WEEKEND = (d: number) => d >= 5;

/** Score every day × block cell for a network and audience. Rows are days (Mon first). */
export function scoreGrid(n: NetworkTimes, audience: Audience): number[][] {
  return n.days.map((dw, d) =>
    n.blocks.map((bw, b) => {
      let s = dw * bw;
      const h = BLOCKS[b];
      if (audience === "b2b") {
        if (WEEKEND(d)) s *= 0.35;
        if (h >= 18) s *= 0.5;
        if (h >= 8 && h < 12) s *= 1.1;
      } else if (audience === "b2c") {
        if (WEEKEND(d)) s *= 1.25;
        if (h >= 18 && h < 22) s *= 1.25;
        if (h < 8) s *= 0.9;
      }
      return s;
    }),
  );
}

export type Slot = { day: number; block: number; score: number };

/** Every cell, best first. Ties keep week order. */
export function rankSlots(grid: number[][]): Slot[] {
  return grid
    .flatMap((row, day) => row.map((score, block) => ({ day, block, score })))
    .sort((a, b) => b.score - a.score || a.day - b.day || a.block - b.block);
}

/** Heat level 0-3 per cell, by rank: the top 5, the next 12, the next 20, the rest. */
export function levels(grid: number[][]): number[][] {
  const out = grid.map((row) => row.map(() => 0));
  rankSlots(grid).forEach((s, i) => {
    out[s.day][s.block] = i < 5 ? 3 : i < 17 ? 2 : i < 37 ? 1 : 0;
  });
  return out;
}

/** "6am", "12pm", "10pm". */
export function hourLabel(h: number): string {
  const x = ((h % 24) + 24) % 24;
  return `${x % 12 || 12}${x < 12 ? "am" : "pm"}`;
}

/** "Tue–Thu" for a run of days, "Mon, Wed" otherwise. Input is any order. */
export function dayRange(days: number[]): string {
  const s = [...new Set(days)].sort((a, b) => a - b);
  const run = s.every((d, i) => i === 0 || d === s[i - 1] + 1);
  if (s.length >= 3 && run) return `${DAYS_SHORT[s[0]]}–${DAYS_SHORT[s[s.length - 1]]}`;
  return s.map((d) => DAYS_SHORT[d]).join(", ");
}

/**
 * The summary for the at-a-glance table: the three strongest days, and the
 * window of blocks around the best one that stay within 85% of it on those days.
 */
export function summary(n: NetworkTimes, audience: Audience = "everyone") {
  const grid = scoreGrid(n, audience);
  const dayMax = grid.map((row) => Math.max(...row));
  const bestDays = dayMax
    .map((m, d) => ({ m, d }))
    .sort((a, b) => b.m - a.m || a.d - b.d)
    .slice(0, 3)
    .map((x) => x.d);
  const col = BLOCKS.map((_, b) => Math.max(...bestDays.map((d) => grid[d][b])));
  const top = col.indexOf(Math.max(...col));
  let from = top;
  let to = top;
  while (from > 0 && col[from - 1] >= col[top] * 0.85) from--;
  while (to < BLOCKS.length - 1 && col[to + 1] >= col[top] * 0.85) to++;
  const worstDay = dayMax.indexOf(Math.min(...dayMax));
  return {
    days: dayRange(bestDays),
    window: `${hourLabel(BLOCKS[from])}–${hourLabel(BLOCKS[to] + 2)}`,
    worst: DAYS[worstDay],
  };
}

/**
 * The next time a weekday + hour comes round in a timezone, as a UTC ISO
 * string: today if it's still ahead, otherwise within the next seven days.
 */
export function nextOccurrence(day: number, hour: number, tz: string, now = new Date()): string {
  const today = localDateKey(now.toISOString(), tz);
  const [y, m, d] = today.split("-").map(Number);
  for (let i = 0; i <= 7; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    if ((date.getUTCDay() + 6) % 7 !== day) continue;
    const iso = zonedTimeToUtc(date.toISOString().slice(0, 10), hour, 0, tz);
    if (Date.parse(iso) > now.getTime()) return iso;
  }
  // Unreachable: the same weekday a week out is always ahead.
  return now.toISOString();
}
