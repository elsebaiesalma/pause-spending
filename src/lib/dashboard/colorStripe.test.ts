import { describe, expect, it } from "vitest";
import { colorStripeSegments } from "./colorStripe";

describe("colorStripeSegments", () => {
  it("counts families, skips untagged items, and sorts largest first", () => {
    expect(colorStripeSegments(["navy", null, "black", "black", "navy", "black", "cream"])).toEqual([
      { colorFamily: "black", count: 3 },
      { colorFamily: "navy", count: 2 },
      { colorFamily: "cream", count: 1 },
    ]);
  });

  it("is empty when nothing is tagged", () => {
    expect(colorStripeSegments([null, null])).toEqual([]);
  });
});
