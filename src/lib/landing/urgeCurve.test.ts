import { describe, expect, it } from "vitest";
import { CURVE_BASELINE, curvePath, curvePoint, litMarks, urgeAt, URGE_MARKS } from "./urgeCurve";

describe("urge curve", () => {
  it("rises sharply to a peak, then only ever falls", () => {
    expect(urgeAt(0)).toBe(0);
    expect(urgeAt(0.06)).toBeCloseTo(1, 5);
    let previous = urgeAt(0.06);
    for (let t = 0.07; t <= 1; t += 0.01) {
      const now = urgeAt(t);
      expect(now).toBeLessThan(previous);
      previous = now;
    }
  });

  it("fades to a small fraction of the peak by hour 25", () => {
    expect(urgeAt(1)).toBeLessThan(0.05);
  });

  it("stays inside the chart", () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const { x, y } = curvePoint(t);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(CURVE_BASELINE);
      expect(y).toBeGreaterThan(0);
    }
  });

  it("builds a single path from the start to the end", () => {
    const d = curvePath();
    expect(d.startsWith("M0.0 280.0")).toBe(true);
    expect(d.split("L")).toHaveLength(101);
  });

  it("lights each hour label as the curve passes it", () => {
    expect(litMarks(0)).toBe(1);
    expect(litMarks(0.3)).toBe(2);
    expect(litMarks(0.7)).toBe(3);
    expect(litMarks(1)).toBe(URGE_MARKS.length);
  });
});
