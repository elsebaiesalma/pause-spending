import { describe, expect, it } from "vitest";
import { matchReason } from "./matchReason";
import type { WardrobeItem } from "@prisma/client";

function item(overrides: Partial<Pick<WardrobeItem, "category" | "colorFamily" | "styleTags">>) {
  return { category: "tops", colorFamily: "black", styleTags: [], ...overrides };
}

describe("matchReason", () => {
  it("names color and category when both match", () => {
    const probe = { category: "tops", colorFamily: "black", styleTags: [] };
    expect(matchReason(probe, item({}))).toBe("same color · same category");
  });

  it("names only category when color differs", () => {
    const probe = { category: "tops", colorFamily: "white", styleTags: [] };
    expect(matchReason(probe, item({ colorFamily: "black" }))).toBe("same category");
  });

  it("adds shared style when a style tag overlaps", () => {
    const probe = { category: "tops", colorFamily: "black", styleTags: ["casual", "classic"] };
    expect(matchReason(probe, item({ styleTags: ["classic"] }))).toBe("same color · same category · shared style");
  });

  it("never invents a match the data doesn't support", () => {
    const probe = { category: null, colorFamily: null, styleTags: [] };
    expect(matchReason(probe, item({ category: "shoes", colorFamily: "red" }))).toBe("similar item");
  });
});
