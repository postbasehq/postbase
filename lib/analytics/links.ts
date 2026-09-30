/** The calendar's day view for the day a post went out, in the viewer's timezone. */
export function dayHref(iso: string, tz: string): string {
  return `/calendar?view=day&date=${new Date(iso).toLocaleDateString("en-CA", { timeZone: tz })}`;
}
