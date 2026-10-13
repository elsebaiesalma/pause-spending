import { describe, expect, it } from "vitest";
import { arrangeOutfit } from "./arrange";

const outfit = [
  { id: "top", category: "tops" },
  { id: "pants", category: "bottoms" },
  { id: "boots", category: "shoes" },
  { id: "bag", category: "bags" },
];

describe("arrangeOutfit", () => {
  it("places every piece, once, fully on the board", () => {
    const placed = arrangeOutfit(outfit);
    expect(placed.map((x) => x.wardrobeItemId).sort()).toEqual(["bag", "boots", "pants", "top"]);
    for (const piece of placed) {
      expect(piece.x).toBeGreaterThanOrEqual(0);
      expect(piece.y).toBeGreaterThanOrEqual(0);
      expect(piece.x + piece.scale).toBeLessThanOrEqual(1);
      // 4:5 card on a 4:5 board: as tall as it is wide in board fractions.
      expect(piece.y + piece.scale).toBeLessThanOrEqual(1);
    }
  });

  it("lays out like a flat-lay: top above bottoms above shoes", () => {
    const at = (id: string) => arrangeOutfit(outfit).find((x) => x.wardrobeItemId === id)!;
    expect(at("top").y).toBeLessThan(at("pants").y);
    expect(at("pants").y).toBeLessThan(at("boots").y);
  });

  it("is deterministic", () => {
    expect(arrangeOutfit(outfit)).toEqual(arrangeOutfit(outfit));
  });

  it("draws outer layers under what they sit with, and gives every piece its own z-order", () => {
    const placed = arrangeOutfit([
      { id: "tee", category: "tops" },
      { id: "coat", category: "outerwear" },
    ]);
    const z = Object.fromEntries(placed.map((x) => [x.wardrobeItemId, x.zOrder]));
    expect(z.coat).toBeLessThan(z.tee);
    expect(new Set(Object.values(z)).size).toBe(2);
  });

  it("spreads two pieces of the same kind instead of stacking them, and copes with unknown categories", () => {
    const placed = arrangeOutfit([
      { id: "a", category: "tops" },
      { id: "b", category: "tops" },
      { id: "c", category: "tops" },
      { id: "hat", category: "hats" },
      { id: "mystery", category: null },
    ]);
    const positions = new Set(placed.map((x) => `${x.x.toFixed(3)},${x.y.toFixed(3)}`));
    expect(positions.size).toBe(placed.length);
  });
});
