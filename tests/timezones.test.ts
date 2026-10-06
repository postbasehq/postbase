import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "@/lib/tz-core";
import { parseScheduleTime } from "@/lib/post-validation";

describe("local times across DST changes", () => {
  it("a time skipped by spring-forward moves forward, never earlier", () => {
    expect(zonedTimeToUtc("2026-03-08", 2, 30, "America/New_York")).toBe("2026-03-08T07:30:00.000Z"); // 03:30 EDT
    expect(zonedTimeToUtc("2026-03-29", 1, 30, "Europe/London")).toBe("2026-03-29T01:30:00.000Z"); // 02:30 BST
    expect(zonedTimeToUtc("2026-10-04", 2, 30, "Australia/Sydney")).toBe("2026-10-03T16:30:00.000Z"); // 03:30 AEDT
  });
  it("a time that happens twice at fall-back is the first one, on either side of UTC", () => {
    expect(zonedTimeToUtc("2026-11-01", 1, 30, "America/New_York")).toBe("2026-11-01T05:30:00.000Z"); // 01:30 EDT
    expect(zonedTimeToUtc("2026-10-25", 1, 30, "Europe/London")).toBe("2026-10-25T00:30:00.000Z"); // 01:30 BST
  });
  it("ordinary times are unchanged", () => {
    expect(zonedTimeToUtc("2026-07-01", 9, 0, "Asia/Kolkata")).toBe("2026-07-01T03:30:00.000Z");
    expect(zonedTimeToUtc("2026-01-15", 9, 0, "America/New_York")).toBe("2026-01-15T14:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-15", 9, 0, "UTC")).toBe("2026-07-15T09:00:00.000Z");
  });
});

describe("schedule times from forms and the API", () => {
  it("an unreadable time is a clear error, not a crash", () => {
    expect(parseScheduleTime("tomorrow-ish")).toEqual({ error: "That schedule time isn't valid." });
    expect(parseScheduleTime("2026-13-45T99:00:00Z")).toEqual({ error: "That schedule time isn't valid." });
  });
  it("normalises to UTC", () => {
    expect(parseScheduleTime("2026-10-01T09:00:00+01:00")).toEqual({ iso: "2026-10-01T08:00:00.000Z" });
    expect(parseScheduleTime("2026-10-01T09:00Z", true)).toEqual({ iso: "2026-10-01T09:00:00.000Z" });
    expect(parseScheduleTime("2026-10-01T09:00:00.000-0500", true)).toEqual({ iso: "2026-10-01T14:00:00.000Z" });
  });
  it("the API refuses a time that doesn't say its timezone", () => {
    expect(parseScheduleTime("2026-10-01T09:00:00", true)).toMatchObject({ error: expect.stringMatching(/needs a timezone/) });
    expect(parseScheduleTime("2026-10-01", true)).toMatchObject({ error: expect.stringMatching(/needs a timezone/) });
  });
});
