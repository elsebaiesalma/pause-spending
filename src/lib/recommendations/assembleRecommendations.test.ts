import { afterEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();
vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({ messages: { parse: parseMock } }),
}));

import { prisma } from "@/lib/prisma";
import { assembleRecommendations } from "./assembleRecommendations";

describe("assembleRecommendations", () => {
  const desiredItemIds: string[] = [];
  const wardrobeItemIds: string[] = [];

  afterEach(async () => {
    parseMock.mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: desiredItemIds } } });
    await prisma.wardrobeItem.deleteMany({ where: { id: { in: wardrobeItemIds } } });
    desiredItemIds.length = 0;
    wardrobeItemIds.length = 0;
  });

  it("grounds outfit ideas only in the user's active wardrobe, dropping references to returned items", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;

    const active = await prisma.wardrobeItem.create({
      data: { userId, itemName: "Black Boots", category: "shoes", status: "active", tagsExtractedAt: new Date() },
    });
    wardrobeItemIds.push(active.id);
    const returned = await prisma.wardrobeItem.create({
      data: { userId, itemName: "Old Jacket", category: "outerwear", status: "returned", tagsExtractedAt: new Date() },
    });
    wardrobeItemIds.push(returned.id);

    const desired = await prisma.desiredItem.create({
      data: { userId, sourceType: "typed", itemName: "Wool Coat", price: "120.00", userConfirmed: true },
    });
    desiredItemIds.push(desired.id);

    // First parse() call is generateShoppingAlternatives, second is generateOutfitIdeas.
    parseMock.mockResolvedValueOnce({ parsed_output: { comparables: [], secondhand: [] } });
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        ideas: [
          { wardrobeItemId: active.id, suggestion: "Pair with your black boots." },
          { wardrobeItemId: returned.id, suggestion: "Pair with a jacket you no longer own." },
        ],
      },
    });

    const payload = await assembleRecommendations(userId, desired.id);

    expect(payload.outfitIdeas).toHaveLength(1);
    expect(payload.outfitIdeas[0].wardrobeItem.id).toBe(active.id);

    const outfitIdeasCall = parseMock.mock.calls[1][0].messages[0].content as string;
    expect(outfitIdeasCall).not.toContain(returned.id);
  });

  it("returns comparables and secondhand alongside the desired item", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const desired = await prisma.desiredItem.create({
      data: { userId, sourceType: "typed", itemName: "Wool Coat", price: "120.00", userConfirmed: true },
    });
    desiredItemIds.push(desired.id);

    parseMock.mockResolvedValueOnce({
      parsed_output: {
        comparables: [{ name: "Budget coat", estimatedPrice: 45, note: "Similar cut" }],
        secondhand: [{ name: "Pre-owned option", estimatedPrice: 30, note: "Often available" }],
      },
    });
    parseMock.mockResolvedValueOnce({ parsed_output: { ideas: [] } });

    const payload = await assembleRecommendations(userId, desired.id);

    expect(payload.desiredItem.id).toBe(desired.id);
    expect(payload.comparables).toHaveLength(1);
    expect(payload.secondhand).toHaveLength(1);
  });
});
