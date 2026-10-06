// Pure timezone helpers (no request APIs), safe to import from client components
// and background jobs. lib/tz re-exports these alongside the cookie-based getTimeZone.

/** Format a UTC ISO timestamp in a timezone; falls back to UTC on a bad tz. */
export function formatInTz(iso: string, tz: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: tz }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(iso));
  }
}

/** The local hour (0-23) and minute of a UTC instant, in a timezone. */
export function localHM(iso: string, tz: string): { hour: number; minute: number } {
  const s = formatInTz(iso, tz, { hour: "2-digit", minute: "2-digit", hour12: false });
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return { hour: (h || 0) % 24, minute: m || 0 };
}

/** The local calendar date (YYYY-MM-DD) of a UTC instant, in a timezone. */
export function localDateKey(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** Offset (ms) of a timezone from UTC at a given instant. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - utcMs;
}

/** The UTC ISO instant of a local wall-clock time (YYYY-MM-DD, hour, minute) in a
 *  timezone. Across a DST change it resolves like Temporal's "compatible" mode:
 *  a time skipped by spring-forward moves forward by the gap (02:30 → 03:30),
 *  and a time that happens twice at fall-back is the first one. */
export function zonedTimeToUtc(dayKey: string, hour: number, minute: number, tz: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, hour, minute);
  try {
    // The offsets in force half a day either side cover any one DST change.
    const before = tzOffsetMs(wall - 12 * 3_600_000, tz);
    const after = tzOffsetMs(wall + 12 * 3_600_000, tz);
    // A candidate is real if the zone really has that offset at that instant.
    const real = [wall - before, wall - after].filter((utc, i) => tzOffsetMs(utc, tz) === [before, after][i]);
    // Twice (fall-back): the earlier. Never (spring-forward): read the time with
    // the offset from before the change, which lands it after the gap.
    const utc = real.length ? Math.min(...real) : wall - before;
    return new Date(utc).toISOString();
  } catch {
    return new Date(wall).toISOString();
  }
}
