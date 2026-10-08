import { describe, expect, it } from "vitest";
import { NETWORK_TIMES, dayRange, hourLabel, levels, nextOccurrence, rankSlots, scoreGrid, summary } from "@/lib/seo/best-times";

const net = (id: string) => NETWORK_TIMES.find((n) => n.id === id)!;

describe("best time to post", () => {
  it("labels hours and day ranges", () => {
    expect([0, 6, 12, 22, 24].map(hourLabel)).toEqual(["12am", "6am", "12pm", "10pm", "12am"]);
    expect(dayRange([3, 1, 2])).toBe("Tue–Thu");
    expect(dayRange([0, 2])).toBe("Mon, Wed");
  });

  it("gives every network a weekday daytime peak, and LinkedIn a dead weekend for businesses", () => {
    for (const n of NETWORK_TIMES) {
      expect(n.days).toHaveLength(7);
      expect(n.blocks).toHaveLength(9);
      const heat = levels(scoreGrid(n, "everyone"));
      expect(heat.flat().filter((l) => l === 3)).toHaveLength(5);
    }
    const b2b = levels(scoreGrid(net("linkedin"), "b2b"));
    expect([...b2b[5], ...b2b[6]].every((l) => l === 0)).toBe(true);
    expect(summary(net("linkedin"))).toMatchObject({ days: "Tue–Thu", window: "8am–2pm" });
  });

  it("consumer audiences move TikTok's best slot into the evening", () => {
    const best = rankSlots(scoreGrid(net("tiktok"), "b2c"))[0];
    expect(best.block).toBeGreaterThanOrEqual(6); // 6pm or later
  });

  it("finds the next occurrence in the audience's zone, across DST", () => {
    // Thu 8 Oct 2026, 12:00 UTC = 08:00 in New York (EDT).
    const now = new Date("2026-10-08T12:00:00Z");
    expect(nextOccurrence(3, 10, "America/New_York", now)).toBe("2026-10-08T14:00:00.000Z"); // later today
    expect(nextOccurrence(3, 6, "America/New_York", now)).toBe("2026-10-15T10:00:00.000Z"); // passed today, so next week
    // Tue 3 Nov is after New York falls back to EST.
    expect(nextOccurrence(1, 10, "America/New_York", new Date("2026-10-28T12:00:00Z"))).toBe("2026-11-03T15:00:00.000Z");
  });
});
