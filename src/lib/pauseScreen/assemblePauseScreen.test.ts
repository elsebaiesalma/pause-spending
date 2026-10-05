import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tagging/llmTagger", () => ({
  extractWardrobeItemTags: vi.fn(),
}));

const parseMock = vi.fn();
vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({ messages: { parse: parseMock } }),
}));

import { extractWardrobeItemTags } from "@/lib/tagging/llmTagger";
import { prisma } from "@/lib/prisma";
import { assemblePauseScreen } from "./assemblePauseScreen";
import { currentMonthKey, setBudgetForMonth } from "@/lib/budget";

describe("assemblePauseScreen", () => {
  const desiredItemIds: string[] = [];
  const wardrobeItemIds: string[] = [];

  afterEach(async () => {
    vi.mocked(extractWardrobeItemTags).mockReset();
    parseMock.mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: desiredItemIds } } });
    await prisma.wardrobeItem.deleteMany({ where: { id: { in: wardrobeItemIds } } });
    await prisma.budget.deleteMany({ where: { month: currentMonthKey() } });
    desiredItemIds.length = 0;
    wardrobeItemIds.length = 0;
  });

  it("assembles a shortlist, explanation, and budget impact for a genuinely similar item", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;

    const owned = await prisma.wardrobeItem.create({
      data: {
        userId,
        itemName: "Navy Blazer",
        category: "outerwear",
        colorFamily: "navy",
        styleTags: ["business-casual"],
        useCaseTags: ["work"],
        tagsExtractedAt: new Date(),
      },
    });
    wardrobeItemIds.push(owned.id);

    await setBudgetForMonth(userId, currentMonthKey(), 200);

    const desired = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: "Navy Wool Coat",
        price: "80.00",
        userConfirmed: true,
      },
    });
    desiredItemIds.push(desired.id);

    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce({
      category: "outerwear",
      colorName: "navy",
      colorFamily: "navy",
      styleTags: ["business-casual"],
      useCaseTags: ["work"],
    });
    parseMock.mockResolvedValueOnce({
      parsed_output: { explanation: "You already own a similar navy business-casual blazer." },
    });

    const payload = await assemblePauseScreen(userId, desired.id);

    expect(payload.similarItems.map((i) => i.id)).toEqual([owned.id]);
    expect(payload.similarItemReasons[owned.id]).toBe("same color · same category · shared style");
    // The reflection migration isn't applied yet (prisma/migrations/
    // 20260925090000_add_desired_item_reflection) - reads against it must
    // degrade to null, not throw, so the pause screen still loads.
    expect(payload.reflection).toBeNull();
    expect(payload.redundancyExplanation).toBe("You already own a similar navy business-casual blazer.");
    expect(payload.budget).toMatchObject({
      hasBudget: true,
      budgetAmount: 200,
      spend: 0,
      remaining: 200,
      spendAfterPurchase: 80,
      remainingAfterPurchase: 120,
    });
  });

  it("renders gracefully with an empty shortlist and no explanation call", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;

    const desired = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: "Bright Orange Raincoat",
        price: "50.00",
        userConfirmed: true,
      },
    });
    desiredItemIds.push(desired.id);

    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce({
      category: "outerwear",
      colorName: "orange",
      colorFamily: "orange",
      styleTags: ["rainwear"],
      useCaseTags: ["outdoor"],
    });

    const payload = await assemblePauseScreen(userId, desired.id);

    expect(payload.similarItems).toEqual([]);
    expect(payload.redundancyExplanation).toBeNull();
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("reports no budget rather than a misleading number when none is set", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;

    const desired = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: "Bright Orange Raincoat",
        price: "50.00",
        userConfirmed: true,
        category: "outerwear",
        colorFamily: "orange",
        styleTags: ["rainwear"],
      },
    });
    desiredItemIds.push(desired.id);

    const payload = await assemblePauseScreen(userId, desired.id);

    expect(payload.budget).toMatchObject({ hasBudget: false });
    expect(extractWardrobeItemTags).not.toHaveBeenCalled();
  });

  it("reports priceKnown: false rather than treating a missing price as $0 spend, when a budget is set", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    await setBudgetForMonth(userId, currentMonthKey(), 200);

    const desired = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: "Bright Orange Raincoat",
        userConfirmed: true,
        category: "outerwear",
        colorFamily: "orange",
        styleTags: ["rainwear"],
      },
    });
    desiredItemIds.push(desired.id);

    const payload = await assemblePauseScreen(userId, desired.id);

    expect(payload.budget).toMatchObject({ hasBudget: true, priceKnown: false, budgetAmount: 200, spend: 0 });
    expect(payload.budget).not.toHaveProperty("spendAfterPurchase");
  });
});
