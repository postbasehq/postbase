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
