import { describe, expect, it } from "vitest";
import {
  RACK,
  categoryKeyOf,
  layoutRack,
  matchesQuery,
  sortEntries,
  visibleEntries,
  type WardrobeEntry,
} from "./wardrobeView";

function entry(id: string, overrides: Partial<WardrobeEntry> = {}): WardrobeEntry {
  return {
    id,
    displayName: id,
    brand: null,
    category: "tops",
    categoryKey: "tops",
    colorLabel: null,
    colorFamily: null,
    price: null,
    ownedSince: null,
    sortTime: 0,
    imageUrl: null,
    needsReview: false,
    ...overrides,
  };
}

describe("categoryKeyOf", () => {
  it("normalises known categories and sends the rest to other", () => {
    expect(categoryKeyOf("Tops")).toBe("tops");
    expect(categoryKeyOf(" shoes ")).toBe("shoes");
    expect(categoryKeyOf("hats")).toBe("other");
    expect(categoryKeyOf(null)).toBe("other");
    expect(categoryKeyOf("other")).toBe("other");
  });
});

describe("layoutRack", () => {
  it("orders sections by rack order, hides empty ones, and puts a divider first in each", () => {
    const layout = layoutRack([
      entry("bag", { categoryKey: "bags" }),
      entry("tee", { categoryKey: "tops" }),
      entry("coat", { categoryKey: "outerwear" }),
      entry("tee2", { categoryKey: "tops" }),
    ]);

    expect(layout.sections.map((s) => s.key)).toEqual(["tops", "outerwear", "bags"]);
    expect(layout.entries.map((e) => (e.kind === "divider" ? `#${e.label}` : e.key))).toEqual([
      "#Tops",
      "tee",
      "tee2",
      "#Outerwear",
      "coat",
      "#Bags",
      "bag",
    ]);
    expect(layout.itemCount).toBe(4);
  });

  it("hangs clothing and stands shoes, bags and accessories on the shelf", () => {
    const layout = layoutRack([
      entry("a", { categoryKey: "dresses" }),
      entry("b", { categoryKey: "shoes" }),
      entry("c", { categoryKey: "accessories" }),
    ]);
    const hangs = Object.fromEntries(layout.entries.flatMap((e) => (e.kind === "item" ? [[e.key, e.hangs]] : [])));
    expect(hangs).toEqual({ a: true, b: false, c: false });
  });

  it("gives every entry a fixed, non-overlapping slot", () => {
    const layout = layoutRack([entry("a"), entry("b"), entry("c", { categoryKey: "shoes" })]);
    const xs = layout.entries.map((e) => e.x);
    expect(xs[0]).toBe(RACK.pad);
    expect(xs[1] - xs[0]).toBe(RACK.dividerW + RACK.gap);
    expect(xs[2] - xs[1]).toBe(RACK.cardW + RACK.gap);
    const last = layout.entries[layout.entries.length - 1];
    expect(layout.width).toBe(last.x + RACK.cardW + RACK.pad);
  });

  it("is empty for no items", () => {
    expect(layoutRack([])).toMatchObject({ entries: [], sections: [], itemCount: 0 });
  });
});

describe("visibleEntries", () => {
  it("returns only entries near the viewport", () => {
    const items = Array.from({ length: 100 }, (_, i) => entry(`i${i}`));
    const layout = layoutRack(items);
    const shown = visibleEntries(layout.entries, 5000, 400, 200);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(20);
    for (const e of shown) {
      expect(e.x).toBeLessThanOrEqual(5000 + 400 + 200);
    }
  });
});

describe("sortEntries and matchesQuery", () => {
  it("sorts by price with unpriced items last, and newest first by default", () => {
    const items = [
      entry("none"),
      entry("pricey", { price: 90, sortTime: 1 }),
      entry("cheap", { price: 10, sortTime: 3 }),
    ];
    expect(sortEntries(items, "price").map((i) => i.id)).toEqual(["cheap", "pricey", "none"]);
    expect(sortEntries(items, "newest").map((i) => i.id)).toEqual(["cheap", "pricey", "none"]);
  });

  it("searches name, brand, category and color, ignoring case", () => {
    const item = entry("x", { displayName: "Boxy Fit Tee", brand: "COS", colorLabel: "Espresso" });
    expect(matchesQuery(item, "boxy")).toBe(true);
    expect(matchesQuery(item, "cos")).toBe(true);
    expect(matchesQuery(item, "espresso")).toBe(true);
    expect(matchesQuery(item, "tops")).toBe(true);
    expect(matchesQuery(item, "denim")).toBe(false);
    expect(matchesQuery(item, "  ")).toBe(true);
  });
});
