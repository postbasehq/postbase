import { localDateKey, localHM, zonedTimeToUtc } from "@/lib/tz-core";

// Recurrence cadences for repeating posts. The keyword is stored on
// posts.repeat_every; the label is what the composer shows.

export const REPEAT_OPTIONS = [
  { value: "day", label: "Every day" },
  { value: "2_days", label: "Every 2 days" },
  { value: "3_days", label: "Every 3 days" },
  { value: "4_days", label: "Every 4 days" },
  { value: "5_days", label: "Every 5 days" },
  { value: "6_days", label: "Every 6 days" },
  { value: "week", label: "Every week" },
  { value: "2_weeks", label: "Every 2 weeks" },
  { value: "month", label: "Every month" },
] as const;

export type RepeatEvery = (typeof REPEAT_OPTIONS)[number]["value"];

const DAYS: Record<string, number> = {
  day: 1,
  "2_days": 2,
  "3_days": 3,
  "4_days": 4,
  "5_days": 5,
  "6_days": 6,
  week: 7,
  "2_weeks": 14,
};

export function isRepeatEvery(v: unknown): v is RepeatEvery {
  return typeof v === "string" && (v in DAYS || v === "month");
}

/** Days in a month (month is 1-12). */
function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Advance one cadence step on the local calendar of `tz`, keeping the local
 * wall-clock time: "every week at 09:00" stays 09:00 across a DST change. A
 * month step clamps to the month's last day (31 Jan → 28/29 Feb, not 3 Mar).
 */
function step(iso: string, key: RepeatEvery, tz: string): string {
  const [y, m, d] = localDateKey(iso, tz).split("-").map(Number);
  const { hour, minute } = localHM(iso, tz);
  let next: Date;
  if (key === "month") {
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    next = new Date(Date.UTC(ny, nm - 1, Math.min(d, daysIn(ny, nm))));
  } else {
    next = new Date(Date.UTC(y, m - 1, d + (DAYS[key] ?? 1)));
  }
  return zonedTimeToUtc(next.toISOString().slice(0, 10), hour, minute, tz);
}

/**
 * The next occurrence strictly in the future, stepped in the post's timezone
 * (UTC when it has none). If the poller fell behind (or the cadence is short),
 * missed slots are skipped rather than backfilled as a burst of catch-up posts.
 */
export function nextOccurrence(
  fromIso: string,
  key: RepeatEvery,
  now: Date = new Date(),
  tz: string | null = null,
): string {
  let iso = fromIso;
  // Guard against a bad/absent base date.
  if (Number.isNaN(new Date(iso).getTime())) iso = now.toISOString();
  let zone = tz || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = "UTC"; // unknown zone name: fall back rather than throw in the publisher
  }
  do {
    iso = step(iso, key, zone);
  } while (new Date(iso).getTime() <= now.getTime());
  return iso;
}
