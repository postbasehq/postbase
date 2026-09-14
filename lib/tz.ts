import { cookies } from "next/headers";

/** The viewer's IANA timezone (from the pb_tz cookie set client-side), or UTC. */
export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get("pb_tz")?.value;
  if (tz && /^[A-Za-z0-9+._/-]{1,64}$/.test(tz)) return tz;
  return "UTC";
}

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
