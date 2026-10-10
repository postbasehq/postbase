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

const isWeekend = (dayKey: string) => [0, 6].includes(new Date(`${dayKey}T12:00:00Z`).getUTCDay());

/** The next check strictly after `now`, or null if the bot has no check times. */
export function nextRunAfter(
  config: Pick<ListenConfig, "times" | "weekdaysOnly" | "timezone">,
  now: Date,
): string | null {
  const times = cleanTimes(config.times);
  if (times.length === 0) return null;
  const tz = validTimeZone(config.timezone) ?? "UTC";
  const today = localDateKey(now.toISOString(), tz);
  for (let i = 0; i < 8; i++) {
    const day = addDays(today, i);
    if (config.weekdaysOnly && isWeekend(day)) continue;
    for (const t of times) {
      const [h, m] = t.split(":").map(Number);
      const at = zonedTimeToUtc(day, h, m, tz);
      if (new Date(at).getTime() > now.getTime()) return at;
    }
  }
  return null;
}
