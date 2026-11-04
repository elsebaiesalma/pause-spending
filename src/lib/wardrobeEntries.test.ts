import { describe, expect, it } from "vitest";
import { recentHangingEntries, toWardrobeEntry } from "./wardrobeEntries";
import type { WardrobeEntry } from "./wardrobeView";

function entry(id: string, categoryKey: string, sortTime: number): WardrobeEntry {
  return {
    id,
    displayName: id,
    brand: null,
    category: categoryKey,
    categoryKey,
    colorLabel: null,
    colorFamily: null,
    price: null,
    ownedSince: null,
    sortTime,
    imageUrl: null,
    needsReview: false,
  };
}

describe("recentHangingEntries", () => {
  it("keeps only hanging categories, newest first, up to the limit", () => {
    const entries = [
      entry("old-top", "tops", 1),
      entry("new-shoes", "shoes", 99),
      entry("new-coat", "outerwear", 50),
      entry("bag", "bags", 98),
      entry("mid-knit", "knitwear", 20),
      entry("dress", "dresses", 30),
      entry("other", "other", 97),
    ];
    expect(recentHangingEntries(entries, 3).map((e) => e.id)).toEqual(["new-coat", "dress", "mid-knit"]);
  });

  it("returns what exists when there are fewer, and nothing when none hang", () => {
    expect(recentHangingEntries([entry("t", "tops", 1)], 4).map((e) => e.id)).toEqual(["t"]);
    expect(recentHangingEntries([entry("s", "shoes", 1), entry("b", "bags", 2)], 4)).toEqual([]);
  });
});

describe("toWardrobeEntry", () => {
  it("strips the brand, capitalizes the color and formats the price", () => {
    const result = toWardrobeEntry({
      id: "1",
      itemName: "COS Boxy Fit Tee",
      category: "Tops",
      colorName: "espresso",
      colorFamily: "brown",
      imageUrl: "",
      ownedSince: new Date("2026-03-01"),
      status: "needs_review",
      sourcePurchase: { merchant: "COS", price: "59" },
    });
    expect(result).toMatchObject({
      displayName: "Boxy Fit Tee",
      brand: "COS",
      categoryKey: "tops",
      colorLabel: "Espresso",
      price: 59,
      ownedSince: "Mar 2026",
      imageUrl: null,
      needsReview: true,
    });
  });
});

describe("toWardrobeEntry brand and price", () => {
  const base = {
    id: "w1",
    itemName: "Aritzia Wool Coat",
    category: "outerwear",
    colorName: null,
    colorFamily: null,
    imageUrl: null,
    ownedSince: null,
    status: "active",
  };

  it("shows what was typed on a piece with no purchase, and strips the brand from the name", () => {
    const entry = toWardrobeEntry({ ...base, brand: "Aritzia", price: "189.50", sourcePurchase: null });
    expect(entry.brand).toBe("Aritzia");
    expect(entry.price).toBe(189.5);
    expect(entry.displayName).toBe("Wool Coat");
  });

  it("prefers the order's merchant and price over typed values", () => {
    const entry = toWardrobeEntry({
      ...base,
      brand: "Typed",
      price: 1,
      sourcePurchase: { merchant: "Aritzia", price: "120.00" },
    });
    expect(entry.brand).toBe("Aritzia");
    expect(entry.price).toBe(120);
  });

  it("is null for both when neither exists", () => {
    const entry = toWardrobeEntry({ ...base, sourcePurchase: null });
    expect(entry.brand).toBeNull();
    expect(entry.price).toBeNull();
  });
});
