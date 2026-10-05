import { cookies } from "next/headers";

/** The viewer's IANA timezone (from the pb_tz cookie set client-side), or UTC. */
export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get("pb_tz")?.value;
  if (tz && /^[A-Za-z0-9+._/-]{1,64}$/.test(tz)) return tz;
  return "UTC";
}

export { formatInTz, localHM, localDateKey, zonedTimeToUtc } from "@/lib/tz-core";
