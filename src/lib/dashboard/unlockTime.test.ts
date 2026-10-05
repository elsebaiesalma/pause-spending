import { describe, expect, it } from "vitest";
import { formatUnlockTime } from "./unlockTime";

describe("formatUnlockTime", () => {
  it("reads as ready once the wait has elapsed", () => {
    const now = new Date(2026, 2, 15, 9, 0);
    expect(formatUnlockTime(new Date(2026, 2, 15, 8, 0), now)).toBe("ready for a decision");
    expect(formatUnlockTime(now, now)).toBe("ready for a decision");
  });

  it("says 'today' for a later time on the same calendar day", () => {
    const now = new Date(2026, 2, 15, 9, 0);
    expect(formatUnlockTime(new Date(2026, 2, 15, 14, 0), now)).toBe("unlocks today, 2pm");
  });

  it("says 'tomorrow' for the next calendar day, formatting whole hours without minutes", () => {
    const now = new Date(2026, 2, 15, 20, 0);
    expect(formatUnlockTime(new Date(2026, 2, 16, 9, 0), now)).toBe("unlocks tomorrow, 9am");
  });

  it("includes minutes only when the time isn't on the hour", () => {
    const now = new Date(2026, 2, 15, 9, 0);
    expect(formatUnlockTime(new Date(2026, 2, 16, 9, 30), now)).toBe("unlocks tomorrow, 9:30am");
  });

  it("names the weekday for 2-6 days out", () => {
    const now = new Date(2026, 2, 15, 9, 0); // Sunday
    expect(formatUnlockTime(new Date(2026, 2, 18, 9, 0), now)).toBe("unlocks Wednesday, 9am");
  });

  it("falls back to a month/day date beyond a week out", () => {
    const now = new Date(2026, 2, 15, 9, 0);
    expect(formatUnlockTime(new Date(2026, 2, 25, 9, 0), now)).toBe("unlocks Mar 25, 9am");
  });

  it("formats noon and midnight correctly (12-hour wraparound)", () => {
    const now = new Date(2026, 2, 15, 0, 0);
    expect(formatUnlockTime(new Date(2026, 2, 15, 12, 0), now)).toBe("unlocks today, 12pm");
    expect(formatUnlockTime(new Date(2026, 2, 16, 0, 0), now)).toBe("unlocks tomorrow, 12am");
  });
});
