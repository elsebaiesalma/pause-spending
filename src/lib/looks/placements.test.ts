import { describe, expect, it } from "vitest";
import { MAX_SCALE, MIN_SCALE, nextLookName, normalizePlacement } from "./placements";

describe("nextLookName", () => {
  it("starts at Look 01 and counts up", () => {
    expect(nextLookName([])).toBe("Look 01");
    expect(nextLookName(["Look 01"])).toBe("Look 02");
  });

  it("goes one past the highest used number, so a deleted look's name is not reused", () => {
    expect(nextLookName(["Look 01", "Look 03"])).toBe("Look 04");
  });

  it("ignores names the person chose", () => {
    expect(nextLookName(["Wedding guest", "Look 02"])).toBe("Look 03");
    expect(nextLookName(["Look 09"])).toBe("Look 10");
  });
});

describe("normalizePlacement", () => {
  const base = { wardrobeItemId: "w1", x: 0.2, y: 0.2, scale: 0.4, zOrder: 1 };

  it("keeps a sensible placement as it is", () => {
    expect(normalizePlacement(base)).toEqual(base);
  });

  it("clamps the size to the allowed range", () => {
    expect(normalizePlacement({ ...base, scale: 0.001 })?.scale).toBe(MIN_SCALE);
    expect(normalizePlacement({ ...base, scale: 9 })?.scale).toBe(MAX_SCALE);
  });

  it("keeps at least a third of the piece on the board so it can be grabbed again", () => {
    const far = normalizePlacement({ ...base, x: 40, y: -40 });
    expect(far?.x).toBeLessThan(1);
    expect(far?.y).toBeLessThan(0.1);
    expect(far!.x + far!.scale).toBeGreaterThan(1);
    expect(far!.y + far!.scale).toBeGreaterThan(0);
  });

  it("rejects non-numeric values", () => {
    expect(normalizePlacement({ ...base, x: Number.NaN })).toBeNull();
    expect(normalizePlacement({ ...base, y: Number.POSITIVE_INFINITY })).toBeNull();
  });
});
