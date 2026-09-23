import { afterEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();

vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({ messages: { parse: parseMock } }),
}));

import { generateRedundancyExplanation } from "./redundancyExplanation";
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
    styleTags: ["business-casual"],
    useCaseTags: ["work"],
    ownedSince: new Date("2026-01-15"),
    status: "active",
    tagsExtractedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

describe("generateRedundancyExplanation", () => {
  afterEach(() => {
    parseMock.mockReset();
  });

  it("returns null without calling the LLM when the shortlist is empty", async () => {
    const result = await generateRedundancyExplanation(
      { itemName: "Navy Sweater", category: "tops", primaryColor: "navy", styleTags: [] },
      []
    );

    expect(result).toBeNull();
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("generates an explanation referencing the shortlist", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { explanation: "You already own a navy blazer in a similar business-casual style." },
    });

    const result = await generateRedundancyExplanation(
      { itemName: "Navy Wool Coat", category: "outerwear", primaryColor: "navy", styleTags: ["business-casual"] },
      [makeWardrobeItem({})]
    );

    expect(result).toBe("You already own a navy blazer in a similar business-casual style.");
    const content = parseMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain("Navy Blazer");
  });

  it("normalizes a stray literal unicode escape from the model into a real character", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { explanation: "You already own something similar \\u2014 a navy blazer." },
    });

    const result = await generateRedundancyExplanation(
      { itemName: "Navy Wool Coat", category: "outerwear", primaryColor: "navy", styleTags: [] },
      [makeWardrobeItem({})]
    );

    expect(result).toBe("You already own something similar — a navy blazer.");
  });
});
