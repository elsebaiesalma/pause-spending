import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./llmTagger", () => ({
  extractWardrobeItemTags: vi.fn(),
}));

import { extractWardrobeItemTags } from "./llmTagger";
import { prisma } from "@/lib/prisma";
import { ensureWardrobeItemTagged } from "./tagWardrobeItem";

describe("ensureWardrobeItemTagged", () => {
  const createdItemIds: string[] = [];

  afterEach(async () => {
    vi.mocked(extractWardrobeItemTags).mockReset();
    await prisma.wardrobeItem.deleteMany({ where: { id: { in: createdItemIds } } });
    createdItemIds.length = 0;
  });

  it("runs extraction and persists the tags for an untagged item", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const item = await prisma.wardrobeItem.create({
      data: { userId, itemName: "Navy Blazer", category: "outerwear" },
    });
    createdItemIds.push(item.id);

    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce({
      category: "outerwear",
      colorName: "navy",
      colorFamily: "navy",
      styleTags: ["business-casual"],
      useCaseTags: ["work"],
    });

    const tagged = await ensureWardrobeItemTagged(item);

    expect(tagged.colorName).toBe("navy");
    expect(tagged.colorFamily).toBe("navy");
    expect(tagged.styleTags).toEqual(["business-casual"]);
    expect(tagged.useCaseTags).toEqual(["work"]);
    expect(tagged.tagsExtractedAt).not.toBeNull();
  });

  it("never re-runs extraction for an already-tagged item (cached)", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const item = await prisma.wardrobeItem.create({
      data: {
        userId,
        itemName: "Navy Blazer",
        category: "outerwear",
        colorFamily: "navy",
        tagsExtractedAt: new Date("2026-01-01"),
      },
    });
    createdItemIds.push(item.id);

    const result = await ensureWardrobeItemTagged(item);

    expect(extractWardrobeItemTags).not.toHaveBeenCalled();
    expect(result.colorFamily).toBe("navy");
  });

  it("calling it twice for the same newly-tagged item only extracts once", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const item = await prisma.wardrobeItem.create({
      data: { userId, itemName: "Wool Scarf", category: "accessories" },
    });
    createdItemIds.push(item.id);

    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce({
      category: "accessories",
      colorName: "burgundy",
      colorFamily: "red",
      styleTags: ["winter"],
      useCaseTags: ["everyday"],
    });

    const firstResult = await ensureWardrobeItemTagged(item);
    const secondResult = await ensureWardrobeItemTagged(firstResult);

    expect(extractWardrobeItemTags).toHaveBeenCalledTimes(1);
    expect(secondResult.colorName).toBe("burgundy");
    expect(secondResult.colorFamily).toBe("red");
  });
});
