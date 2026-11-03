import { describe, expect, it } from "vitest";
import { compareAttributes, similarityBand } from "./attributeMatch";

const boots = { category: "shoes", colorFamily: "black", colorName: "Black", styleTags: ["classic", "edgy"] };

describe("compareAttributes", () => {
  it("marks each shared attribute as a match, with readable labels", () => {
    const rows = compareAttributes(boots, { category: "shoes", colorFamily: "black", colorName: null, styleTags: ["edgy"] });

    expect(rows).toEqual([
      { label: "Color", wanted: "Black", owned: "Black", match: true },
      { label: "Category", wanted: "Shoes", owned: "Shoes", match: true },
      { label: "Style", wanted: "Edgy", owned: "Edgy", match: true },
    ]);
  });

  it("says different instead of hiding a mismatch", () => {
    const rows = compareAttributes(boots, { category: "shoes", colorFamily: "brown", colorName: "Tan", styleTags: ["boho"] });

    expect(rows.find((r) => r.label === "Color")).toEqual({ label: "Color", wanted: "Black", owned: "Tan", match: false });
    expect(rows.find((r) => r.label === "Style")?.match).toBe(false);
  });

  it("leaves out an attribute either item is missing, rather than guessing", () => {
    const rows = compareAttributes({ ...boots, styleTags: [] }, { category: null, colorFamily: "black", styleTags: [] });

    expect(rows.map((r) => r.label)).toEqual(["Color"]);
  });
});

describe("similarityBand", () => {
  it("words the overlap as a band, never a percentage", () => {
    const match = { label: "Color", wanted: "a", owned: "a", match: true } as const;
    const differ = { ...match, match: false };
    expect(similarityBand([match, match, differ])).toBe("Very similar");
    expect(similarityBand([match, differ])).toBe("Somewhat similar");
    expect(similarityBand([differ])).toBe("A little similar");
  });
});
