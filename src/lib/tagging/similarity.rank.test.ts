import { describe, expect, it } from "vitest";
import type { WardrobeItem } from "@prisma/client";
import { rankSimilarItems } from "./similarity";

const item = (id: string, itemName: string, colorFamily: string, styleTags: string[]) =>
  ({ id, itemName, colorFamily, styleTags, useCaseTags: [] }) as unknown as WardrobeItem;

describe("rankSimilarItems", () => {
  const probe = {
    category: "tops",
    colorFamily: "white",
    styleTags: ["basic", "casual", "minimal"],
    itemName: "The Organic Cotton Crew Tee",
  };

  it("puts the same colour first, then breaks an identical tag tie by the garment word", () => {
    const green = item("green", "Cotton Rib Tank", "green", ["basic", "casual"]);
    const whiteTank = item("tank", "Cotton Rib Crop Tank", "white", ["basic", "casual", "minimal"]);
    const whiteTee = item("tee", "Boxy Heavyweight Tee", "white", ["basic", "casual", "minimal"]);
    expect(rankSimilarItems([green, whiteTank, whiteTee], probe).map((i) => i.id)).toEqual(["tee", "tank", "green"]);
  });

  it("keeps the given order when scores are equal", () => {
    const a = item("a", "Linen Shirt", "white", ["basic"]);
    const b = item("b", "Silk Blouse", "white", ["basic"]);
    expect(rankSimilarItems([a, b], { ...probe, itemName: null }).map((i) => i.id)).toEqual(["a", "b"]);
  });
});
