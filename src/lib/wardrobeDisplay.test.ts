import { describe, expect, it } from "vitest";
import { capitalizeFirst, stripBrandPrefix } from "./wardrobeDisplay";

describe("stripBrandPrefix", () => {
  it("strips a leading brand from the display name", () => {
    expect(stripBrandPrefix("COS Boxy Fit Tee", "COS")).toBe("Boxy Fit Tee");
  });

  it("is case-insensitive and drops a separator after the brand", () => {
    expect(stripBrandPrefix("everlane - The Cotton Crew Tee", "Everlane")).toBe("The Cotton Crew Tee");
    expect(stripBrandPrefix("Everlane The Cotton Crew Tee — White", "everlane")).toBe(
      "The Cotton Crew Tee — White"
    );
  });

  it("only strips at a word boundary", () => {
    expect(stripBrandPrefix("Cosmic Tee", "COS")).toBe("Cosmic Tee");
  });

  it("leaves a name alone when the brand is absent, elsewhere in the name, or unknown", () => {
    expect(stripBrandPrefix("Boxy Fit Tee by COS", "COS")).toBe("Boxy Fit Tee by COS");
    expect(stripBrandPrefix("Boxy Fit Tee", null)).toBe("Boxy Fit Tee");
    expect(stripBrandPrefix("Boxy Fit Tee", "  ")).toBe("Boxy Fit Tee");
  });

  it("never returns an empty name", () => {
    expect(stripBrandPrefix("COS", "COS")).toBe("COS");
    expect(stripBrandPrefix("COS - ", "COS")).toBe("COS - ");
  });
});

describe("capitalizeFirst", () => {
  it("capitalizes only the first letter and trims", () => {
    expect(capitalizeFirst("espresso")).toBe("Espresso");
    expect(capitalizeFirst("  off white ")).toBe("Off white");
    expect(capitalizeFirst("Navy")).toBe("Navy");
    expect(capitalizeFirst("")).toBe("");
  });
});
