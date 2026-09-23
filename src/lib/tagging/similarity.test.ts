import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { findSimilarWardrobeItems } from "./similarity";

describe("findSimilarWardrobeItems", () => {
  let userId: string;
  const createdItemIds: string[] = [];

  afterEach(async () => {
    await prisma.wardrobeItem.deleteMany({ where: { id: { in: createdItemIds } } });
    createdItemIds.length = 0;
  });

  async function makeItem(overrides: {
    itemName: string;
    category: string | null;
    primaryColor?: string | null;
    styleTags?: string[];
    useCaseTags?: string[];
    status?: string;
  }) {
    const item = await prisma.wardrobeItem.create({
      data: {
        userId,
        itemName: overrides.itemName,
        category: overrides.category,
        primaryColor: overrides.primaryColor ?? null,
        styleTags: overrides.styleTags ?? [],
        useCaseTags: overrides.useCaseTags ?? [],
        status: overrides.status ?? "active",
        tagsExtractedAt: new Date(),
      },
    });
    createdItemIds.push(item.id);
    return item;
  }

  it("returns items in the same category with an overlapping style tag", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const match = await makeItem({
      itemName: "Navy Blazer",
      category: "outerwear",
      styleTags: ["business-casual"],
    });
    await makeItem({ itemName: "Running Shoes", category: "shoes", styleTags: ["athletic"] });

    const results = await findSimilarWardrobeItems(userId, {
      category: "outerwear",
      styleTags: ["business-casual"],
    });

    expect(results.map((r) => r.id)).toEqual([match.id]);
  });

  it("returns items in the same category with a matching primary color", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const match = await makeItem({ itemName: "Navy Sweater", category: "tops", primaryColor: "navy" });
    await makeItem({ itemName: "Red Sweater", category: "tops", primaryColor: "red" });

    const results = await findSimilarWardrobeItems(userId, {
      category: "tops",
      primaryColor: "navy",
    });

    expect(results.map((r) => r.id)).toEqual([match.id]);
  });

  it("excludes items in a different category even with overlapping tags", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    await makeItem({ itemName: "Athletic Shoes", category: "shoes", styleTags: ["athletic"] });

    const results = await findSimilarWardrobeItems(userId, {
      category: "tops",
      styleTags: ["athletic"],
    });

    expect(results).toHaveLength(0);
  });

  it("excludes items in the same category with no overlapping color, style, or use-case tags", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    await makeItem({
      itemName: "Formal Silk Blouse",
      category: "tops",
      primaryColor: "cream",
      styleTags: ["formal"],
      useCaseTags: ["formal-event"],
    });

    const results = await findSimilarWardrobeItems(userId, {
      category: "tops",
      primaryColor: "black",
      styleTags: ["athletic"],
      useCaseTags: ["gym"],
    });

    expect(results).toHaveLength(0);
  });

  it("excludes returned items even if they'd otherwise match", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    await makeItem({
      itemName: "Returned Blazer",
      category: "outerwear",
      styleTags: ["business-casual"],
      status: "returned",
    });

    const results = await findSimilarWardrobeItems(userId, {
      category: "outerwear",
      styleTags: ["business-casual"],
    });

    expect(results).toHaveLength(0);
  });

  it("returns an empty shortlist when the probe has no category", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    const results = await findSimilarWardrobeItems(userId, { category: null });

    expect(results).toEqual([]);
  });
});
