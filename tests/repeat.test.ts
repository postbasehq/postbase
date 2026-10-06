import { describe, expect, it } from "vitest";
import { nextOccurrence } from "@/lib/publish/repeat";
import { formatInTz } from "@/lib/tz-core";

const local = (iso: string, tz: string) => formatInTz(iso, tz, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
const after = (iso: string) => new Date(Date.parse(iso) + 60_000);

describe("repeating posts keep their local time", () => {
  it("across the UK clocks going back", () => {
    const next = nextOccurrence("2026-10-21T08:00:00Z", "week", after("2026-10-21T08:00:00Z"), "Europe/London");
    expect(local(next, "Europe/London")).toBe("28 Oct, 09:00");
  });
  it("across the US change and the southern-hemisphere one", () => {
    expect(local(nextOccurrence("2026-10-29T13:00:00Z", "week", after("2026-10-29T13:00:00Z"), "America/New_York"), "America/New_York")).toBe("05 Nov, 09:00");
    expect(local(nextOccurrence("2026-09-29T23:00:00Z", "week", after("2026-09-29T23:00:00Z"), "Australia/Sydney"), "Australia/Sydney")).toBe("07 Oct, 09:00");
  });
  it("into the missing spring-forward hour lands on a real time", () => {
    const next = nextOccurrence("2027-03-27T01:30:00Z", "day", after("2027-03-27T01:30:00Z"), "Europe/London");
    expect(local(next, "Europe/London")).toBe("28 Mar, 02:30");
  });
});

describe("months and edge cases", () => {
  it("clamps to the end of shorter months", () => {
    expect(nextOccurrence("2026-01-31T09:00:00Z", "month", after("2026-01-31T09:00:00Z"))).toBe("2026-02-28T09:00:00.000Z");
    expect(nextOccurrence("2028-01-31T09:00:00Z", "month", after("2028-01-31T09:00:00Z"), "Europe/London")).toBe("2028-02-29T09:00:00.000Z");
  });
  it("falls back to UTC for no or unknown timezones", () => {
    expect(nextOccurrence("2026-10-21T08:00:00Z", "week", after("2026-10-21T08:00:00Z"), "Mars/Olympus")).toBe("2026-10-28T08:00:00.000Z");
  });
  it("catches up in one step, however far behind (and bad dates restart from now)", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    const t = performance.now();
    const next = nextOccurrence("2001-01-05T09:00:00Z", "day", now, "Europe/London");
    expect(performance.now() - t).toBeLessThan(200);
    expect(local(next, "Europe/London")).toBe("06 Oct, 09:00");
    expect(Date.parse(nextOccurrence("0001-01-01T09:00:00Z", "day", now, "Europe/London"))).toBeGreaterThan(now.getTime());
  });
});
