import { afterEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();

vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({ messages: { parse: parseMock } }),
}));

import { extractPurchaseItems } from "./llmExtractor";
import type { ImageCandidate } from "./htmlUtils";

const EMAIL = { from: "orders@retailer.com", subject: "Your order", html: "<html></html>" };

describe("extractPurchaseItems", () => {
  afterEach(() => parseMock.mockReset());

  it("resolves each item's imageIndex against the given candidate list", async () => {
    const candidates: ImageCandidate[] = [
      { imageUrl: "https://cdn.retailer.com/blazer.jpg", productLink: "https://retailer.com/products/blazer" },
      { imageUrl: "https://cdn.retailer.com/scarf.jpg" },
    ];
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        merchant: "Retailer",
        orderReference: null,
        confident: true,
        items: [
          { itemName: "Navy Blazer", price: 199, category: "outerwear", imageIndex: 1 },
          { itemName: "Silk Scarf", price: 39, category: "accessories", imageIndex: 2 },
        ],
      },
    });

    const result = await extractPurchaseItems(EMAIL, candidates);

    expect(result.items[0]).toEqual({
      itemName: "Navy Blazer",
      price: 199,
      category: "outerwear",
      imageUrl: "https://cdn.retailer.com/blazer.jpg",
      productLink: "https://retailer.com/products/blazer",
    });
    expect(result.items[1]).toEqual({
      itemName: "Silk Scarf",
      price: 39,
      category: "accessories",
      imageUrl: "https://cdn.retailer.com/scarf.jpg",
      productLink: null,
    });
  });

  it("leaves imageUrl/productLink null when the model says no candidate matches", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        merchant: "Retailer",
        orderReference: null,
        confident: true,
        items: [{ itemName: "Navy Blazer", price: 199, category: "outerwear", imageIndex: null }],
      },
    });

    const result = await extractPurchaseItems(EMAIL, [{ imageUrl: "https://cdn.retailer.com/blazer.jpg" }]);

    expect(result.items[0].imageUrl).toBeNull();
    expect(result.items[0].productLink).toBeNull();
  });

  it("treats an out-of-range imageIndex (hallucinated or off-by-one) as no match, rather than pointing at the wrong candidate", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        merchant: "Retailer",
        orderReference: null,
        confident: true,
        items: [{ itemName: "Navy Blazer", price: 199, category: "outerwear", imageIndex: 5 }],
      },
    });

    const result = await extractPurchaseItems(EMAIL, [{ imageUrl: "https://cdn.retailer.com/blazer.jpg" }]);

    expect(result.items[0].imageUrl).toBeNull();
  });

  it("includes the numbered candidate list, with product links, in the prompt sent to the model", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { merchant: "Retailer", orderReference: null, confident: true, items: [] },
    });

    await extractPurchaseItems(EMAIL, [
      { imageUrl: "https://cdn.retailer.com/blazer.jpg", productLink: "https://retailer.com/products/blazer" },
    ]);

    const content = parseMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain("1. https://cdn.retailer.com/blazer.jpg");
    expect(content).toContain("https://retailer.com/products/blazer");
  });

  it("tells the model no candidates were found when the list is empty", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { merchant: "Retailer", orderReference: null, confident: true, items: [] },
    });

    await extractPurchaseItems(EMAIL);

    const content = parseMock.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain("Candidate images: none found.");
  });
});
