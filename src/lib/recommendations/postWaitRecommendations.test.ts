import { afterEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();

vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({ messages: { parse: parseMock } }),
}));

import { generateOutfitIdeas, generateShoppingAlternatives } from "./postWaitRecommendations";
import type { WardrobeItem } from "@prisma/client";

function makeWardrobeItem(overrides: Partial<WardrobeItem>): WardrobeItem {
  return {
    id: "w1",
    userId: "u1",
    sourcePurchaseId: null,
    itemName: "Navy Blazer",
    imageUrl: null,
    category: "outerwear",
    primaryColor: "navy",
    secondaryColor: null,
    styleTags: [],
    useCaseTags: [],
    ownedSince: null,
    status: "active",
    tagsExtractedAt: new Date(),
    ...overrides,
  };
}

describe("generateShoppingAlternatives", () => {
  afterEach(() => parseMock.mockReset());

  it("returns comparables and secondhand suggestions from the model", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        comparables: [{ name: "Similar coat from a budget brand", estimatedPrice: 45, note: "Similar cut" }],
        secondhand: [{ name: "Pre-owned on Poshmark", estimatedPrice: 30, note: "Often available" }],
      },
    });

    const result = await generateShoppingAlternatives({ itemName: "Wool Coat", price: "120.00" as never, category: "outerwear" });

    expect(result.comparables).toHaveLength(1);
    expect(result.secondhand).toHaveLength(1);
  });

  it("normalizes stray literal unicode escapes from the model in names and notes", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        comparables: [{ name: "Budget coat \\u2014 similar cut", estimatedPrice: 45, note: "Good value \\u2014 similar fit" }],
        secondhand: [],
      },
    });

    const result = await generateShoppingAlternatives({ itemName: "Wool Coat", price: "120.00" as never, category: "outerwear" });

    expect(result.comparables[0].name).toBe("Budget coat — similar cut");
    expect(result.comparables[0].note).toBe("Good value — similar fit");
  });
});

describe("generateOutfitIdeas", () => {
  afterEach(() => parseMock.mockReset());

  it("returns an empty list without calling the LLM when there are no candidates", async () => {
    const result = await generateOutfitIdeas({ itemName: "Wool Coat", category: "outerwear" }, []);

    expect(result).toEqual([]);
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("only includes ideas that reference a real candidate wardrobe item - hallucinated ids are dropped", async () => {
    const realItem = makeWardrobeItem({ id: "real-1", itemName: "Navy Blazer" });

    parseMock.mockResolvedValueOnce({
      parsed_output: {
        ideas: [
          { wardrobeItemId: "real-1", suggestion: "Pair with your navy blazer." },
          { wardrobeItemId: "hallucinated-id", suggestion: "Pair with a jacket you don't actually own." },
        ],
      },
    });

    const ideas = await generateOutfitIdeas({ itemName: "Wool Coat", category: "outerwear" }, [realItem]);

    expect(ideas).toHaveLength(1);
    expect(ideas[0].wardrobeItem.id).toBe("real-1");
    expect(ideas[0].suggestion).toBe("Pair with your navy blazer.");
  });

  it("passes only the given candidates' ids/names to the model", async () => {
    const item = makeWardrobeItem({ id: "abc", itemName: "Black Boots" });
    parseMock.mockResolvedValueOnce({ parsed_output: { ideas: [] } });

    await generateOutfitIdeas({ itemName: "Wool Coat", category: "outerwear" }, [item]);

    const content = parseMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain("abc");
    expect(content).toContain("Black Boots");
  });

  it("normalizes a stray literal unicode escape in an outfit idea suggestion", async () => {
    const item = makeWardrobeItem({ id: "abc", itemName: "Black Boots" });
    parseMock.mockResolvedValueOnce({
      parsed_output: { ideas: [{ wardrobeItemId: "abc", suggestion: "Pair with your boots \\u2014 easy." }] },
    });

    const ideas = await generateOutfitIdeas({ itemName: "Wool Coat", category: "outerwear" }, [item]);

    expect(ideas[0].suggestion).toBe("Pair with your boots — easy.");
  });
});
