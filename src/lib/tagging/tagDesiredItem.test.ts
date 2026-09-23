import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./llmTagger", () => ({
  extractWardrobeItemTags: vi.fn(),
}));

import { extractWardrobeItemTags } from "./llmTagger";
import { prisma } from "@/lib/prisma";
import { ensureDesiredItemTagged } from "./tagDesiredItem";

describe("ensureDesiredItemTagged", () => {
  const createdItemIds: string[] = [];

  afterEach(async () => {
    vi.mocked(extractWardrobeItemTags).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdItemIds } } });
    createdItemIds.length = 0;
  });

  it("runs extraction and persists tags for an untagged item", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const item = await prisma.desiredItem.create({
      data: { userId, sourceType: "typed", itemName: "Navy Blazer" },
    });
    createdItemIds.push(item.id);

    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce({
      category: "outerwear",
      primaryColor: "navy",
      secondaryColor: null,
      styleTags: ["business-casual"],
      useCaseTags: ["work"],
    });

    const tagged = await ensureDesiredItemTagged(item);

    expect(tagged.category).toBe("outerwear");
    expect(tagged.primaryColor).toBe("navy");
    expect(tagged.styleTags).toEqual(["business-casual"]);
  });

  it("never re-runs extraction for an item that already has a category (cached)", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const item = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: "Navy Blazer",
        category: "outerwear",
        primaryColor: "navy",
      },
    });
    createdItemIds.push(item.id);

    const result = await ensureDesiredItemTagged(item);

    expect(extractWardrobeItemTags).not.toHaveBeenCalled();
    expect(result.primaryColor).toBe("navy");
  });
});
