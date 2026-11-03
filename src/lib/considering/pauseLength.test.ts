import { describe, expect, it } from "vitest";
import { pauseLengthLabel } from "./pauseLength";

const start = new Date("2026-10-01T12:00:00Z");
const after = (hours: number) => new Date(start.getTime() + hours * 60 * 60 * 1000);

describe("pauseLengthLabel", () => {
  it("labels a 24-hour pause", () => {
    expect(pauseLengthLabel(start, after(24))).toBe("Paused 24 hours");
  });

  it("labels a 7-day pause", () => {
    expect(pauseLengthLabel(start, after(7 * 24))).toBe("Paused 7 days");
  });

  it("gives no label for odd lengths or missing dates", () => {
    expect(pauseLengthLabel(start, after(60))).toBeNull();
    expect(pauseLengthLabel(null, after(24))).toBeNull();
    expect(pauseLengthLabel(start, null)).toBeNull();
    expect(pauseLengthLabel(start, after(-5))).toBeNull();
  });
});
