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
    colorFamily?: string | null;
    styleTags?: string[];
    useCaseTags?: string[];
    status?: string;
  }) {
    const item = await prisma.wardrobeItem.create({
      data: {
        userId,
        itemName: overrides.itemName,
        category: overrides.category,
        colorFamily: overrides.colorFamily ?? null,
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

  it("returns items in the same category with a matching color family", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const match = await makeItem({ itemName: "Navy Sweater", category: "tops", colorFamily: "navy" });
    await makeItem({ itemName: "Red Sweater", category: "tops", colorFamily: "red" });

    const results = await findSimilarWardrobeItems(userId, {
      category: "tops",
      colorFamily: "navy",
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
      colorFamily: "cream",
      styleTags: ["formal"],
      useCaseTags: ["formal-event"],
    });

    const results = await findSimilarWardrobeItems(userId, {
      category: "tops",
      colorFamily: "black",
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

  describe("null colorFamily - unknown, skip this dimension, never a match, never a non-match", () => {
    // Every un-backfilled historical row takes this path: colorFamily is
    // null until the backfill script (or an old auto-tag) resolves it.

    it("both sides null: a null probe and a null candidate still match through another overlapping dimension", async () => {
      userId = (await prisma.user.findFirstOrThrow()).id;
      const match = await makeItem({
        itemName: "Untagged Blazer",
        category: "outerwear",
        colorFamily: null,
        styleTags: ["business-casual"],
      });

      const results = await findSimilarWardrobeItems(userId, {
        category: "outerwear",
        colorFamily: null,
        styleTags: ["business-casual"],
      });

      expect(results.map((r) => r.id)).toEqual([match.id]);
    });

    it("both sides null and no other overlap: excluded, not included - null is never itself a match", async () => {
      userId = (await prisma.user.findFirstOrThrow()).id;
      await makeItem({ itemName: "Untagged Sweater", category: "tops", colorFamily: null, styleTags: [] });

      const results = await findSimilarWardrobeItems(userId, {
        category: "tops",
        colorFamily: null,
        styleTags: ["business-casual"],
      });

      expect(results).toHaveLength(0);
    });

    it("candidate side null: a probe with a real colorFamily still matches a null-colorFamily candidate through style overlap", async () => {
      userId = (await prisma.user.findFirstOrThrow()).id;
      const match = await makeItem({
        itemName: "Untagged Blazer",
        category: "outerwear",
        colorFamily: null,
        styleTags: ["business-casual"],
      });

      const results = await findSimilarWardrobeItems(userId, {
        category: "outerwear",
        colorFamily: "navy",
        styleTags: ["business-casual"],
      });

      expect(results.map((r) => r.id)).toEqual([match.id]);
    });

    it("candidate side null with no other overlap: excluded - a null candidate colorFamily never satisfies a non-null probe", async () => {
      userId = (await prisma.user.findFirstOrThrow()).id;
      await makeItem({ itemName: "Untagged Sweater", category: "tops", colorFamily: null, styleTags: [] });

      const results = await findSimilarWardrobeItems(userId, {
        category: "tops",
        colorFamily: "navy",
        styleTags: ["athletic"],
      });

      expect(results).toHaveLength(0);
    });

    it("probe side null: a null probe colorFamily never bridges a match on a candidate's own colorFamily value", async () => {
      userId = (await prisma.user.findFirstOrThrow()).id;
      await makeItem({ itemName: "Navy Sweater", category: "tops", colorFamily: "navy", styleTags: [] });

      const results = await findSimilarWardrobeItems(userId, {
        category: "tops",
        colorFamily: null,
        styleTags: ["athletic"],
      });

      expect(results).toHaveLength(0);
    });
  });
});
