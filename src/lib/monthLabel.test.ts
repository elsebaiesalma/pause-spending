import { describe, expect, it } from "vitest";
import { formatMonthLabel } from "./monthLabel";

describe("formatMonthLabel", () => {
  it("turns a year-month key into the month name", () => {
    expect(formatMonthLabel("2026-10")).toBe("October");
    expect(formatMonthLabel("2026-01")).toBe("January");
    expect(formatMonthLabel("2025-12")).toBe("December");
  });

  it("falls back to the raw key rather than showing nothing", () => {
    expect(formatMonthLabel("nonsense")).toBe("nonsense");
    expect(formatMonthLabel("2026-13")).toBe("2026-13");
  });
});
