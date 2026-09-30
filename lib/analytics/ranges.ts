/** Analytics date ranges, in days. Safe to import from client components. */
export const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type RangeKey = keyof typeof RANGES;

export function parseRange(v: string | null | undefined): RangeKey {
  return v && v in RANGES ? (v as RangeKey) : "30d";
}
