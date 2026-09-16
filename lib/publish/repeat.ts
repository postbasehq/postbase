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

/** Advance a date by one cadence step (calendar-aware for "month"). */
function step(date: Date, key: RepeatEvery): Date {
  const d = new Date(date);
  if (key === "month") {
    d.setUTCMonth(d.getUTCMonth() + 1);
  } else {
    d.setUTCDate(d.getUTCDate() + (DAYS[key] ?? 1));
  }
  return d;
}

/**
 * The next occurrence strictly in the future. If the poller fell behind
 * (or the cadence is short), we skip missed slots rather than backfilling
 * a burst of catch-up posts — the next post lands on the upcoming slot.
 */
export function nextOccurrence(fromIso: string, key: RepeatEvery, now: Date = new Date()): string {
  let d = new Date(fromIso);
  // Guard against a bad/absent base date.
  if (Number.isNaN(d.getTime())) d = new Date(now);
  do {
    d = step(d, key);
  } while (d.getTime() <= now.getTime());
  return d.toISOString();
}
