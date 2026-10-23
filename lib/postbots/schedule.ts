import { localDateKey, zonedTimeToUtc } from "@/lib/tz-core";
import type { ListenConfig } from "@/lib/postbots/types";

/** At most this many checks a day, so a bot's model cost stays bounded. */
export const MAX_CHECKS_PER_DAY = 6;

const HM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Valid "HH:MM" times, normalised, sorted and capped. */
export function cleanTimes(times: unknown): string[] {
  const list = Array.isArray(times) ? times : [];
  const out = new Set<string>();
  for (const t of list) {
    const m = String(t).trim().match(HM);
    if (m) out.add(`${m[1].padStart(2, "0")}:${m[2]}`);
  }
  return [...out].sort().slice(0, MAX_CHECKS_PER_DAY);
}

export function validTimeZone(tz: unknown): string | null {
  if (typeof tz !== "string" || !tz) return null;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

function addDays(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const weekday = (dayKey: string) => new Date(`${dayKey}T12:00:00Z`).getUTCDay();

/** The first of `times` on an allowed day strictly after `now`, within a week. */
function nextAt(times: string[], allowed: (day: number) => boolean, timezone: unknown, now: Date): string | null {
  if (times.length === 0) return null;
  const tz = validTimeZone(timezone) ?? "UTC";
  const today = localDateKey(now.toISOString(), tz);
  for (let i = 0; i < 8; i++) {
    const day = addDays(today, i);
    if (!allowed(weekday(day))) continue;
    for (const t of times) {
      const [h, m] = t.split(":").map(Number);
      const at = zonedTimeToUtc(day, h, m, tz);
      if (new Date(at).getTime() > now.getTime()) return at;
    }
  }
  return null;
}

/** The next check strictly after `now`, or null if the bot has no check times. */
export function nextRunAfter(
  config: Pick<ListenConfig, "times" | "weekdaysOnly" | "timezone">,
  now: Date,
): string | null {
  return nextAt(cleanTimes(config.times), (d) => !config.weekdaysOnly || (d !== 0 && d !== 6), config.timezone, now);
}

/** At most this many runs a day for one routine: each run is a full bot turn. */
export const MAX_ROUTINE_RUNS_PER_DAY = 3;

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Days as 0 (Sunday) … 6 (Saturday), from numbers or names ("Mon", "monday"); sorted, unique. */
export function cleanDays(days: unknown): number[] {
  const list = Array.isArray(days) ? days : [];
  const out = new Set<number>();
  for (const d of list) {
    const n = typeof d === "number" ? d : DAY_NAMES.indexOf(String(d).trim().toLowerCase().slice(0, 3));
    if (Number.isInteger(n) && n >= 0 && n <= 6) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** A routine's next run strictly after `now`. Empty `days` means every day. */
export function nextRoutineRun(r: { times: unknown; days: unknown; timezone: unknown }, now: Date): string | null {
  const days = cleanDays(r.days);
  const times = cleanTimes(r.times).slice(0, MAX_ROUTINE_RUNS_PER_DAY);
  return nextAt(times, (d) => days.length === 0 || days.includes(d), r.timezone, now);
}

/** "Mondays and Thursdays at 09:05", "Every day at 08:30 and 17:30". */
export function describeRoutineWhen(days: number[], times: string[]): string {
  const label = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  const join = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const weekdays = days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d));
  const when = days.length === 0 || days.length === 7 ? "Every day" : weekdays ? "Weekdays" : join(days.map((d) => label[d]));
  return `${when} at ${join(times)}`;
}
