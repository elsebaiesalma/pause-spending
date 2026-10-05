import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tagging/llmTagger", () => ({
  extractWardrobeItemTags: vi.fn(),
}));

vi.mock("./browserWorkerClient", () => ({
  fetchViaBrowserWorker: vi.fn(),
}));

import { extractWardrobeItemTags, type WardrobeItemTags } from "@/lib/tagging/llmTagger";
import { fetchViaBrowserWorker } from "./browserWorkerClient";
import { extractFromUrl } from "./urlExtractor";

const FAKE_TAGS: WardrobeItemTags = {
  category: "outerwear",
  colorName: "navy",
  colorFamily: "navy",
  styleTags: ["business-casual"],
  useCaseTags: ["work"],
};

function fakeResponse(html: string, ok = true) {
  return {
    ok,
    text: async () => html,
  } as Response;
}

describe("extractFromUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(extractWardrobeItemTags).mockReset();
    vi.mocked(fetchViaBrowserWorker).mockReset();
  });

  it("extracts name/price/image from JSON-LD Product schema when present, and tags via the wardrobe tagger", async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type": "Product", "name": "Navy Wool Blazer", "image": "https://cdn.retailer.com/blazer.jpg", "offers": {"price": "189.99"}}
        </script>
        <meta property="og:title" content="Wrong Title" />
      </head></html>
    `;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result).toEqual({
      itemName: "Navy Wool Blazer",
      price: 189.99,
      imageUrl: "https://cdn.retailer.com/blazer.jpg",
      category: "outerwear",
      colorName: "navy",
      colorFamily: "navy",
      styleTags: ["business-casual"],
      confidence: { itemName: "high", price: "high", imageUrl: "high" },
    });
    expect(extractWardrobeItemTags).toHaveBeenCalledWith({
      itemName: "Navy Wool Blazer",
      category: null,
      imageUrl: "https://cdn.retailer.com/blazer.jpg",
    });
  });

  it("falls back to Open Graph tags when there is no JSON-LD Product schema", async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Navy Wool Blazer" />
        <meta property="og:image" content="https://cdn.retailer.com/blazer.jpg" />
      </head></html>
    `;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result?.itemName).toBe("Navy Wool Blazer");
    expect(result?.price).toBeNull();
    expect(result?.imageUrl).toBe("https://cdn.retailer.com/blazer.jpg");
    expect(result?.confidence?.itemName).toBe("medium");
    expect(result?.confidence?.imageUrl).toBe("medium");
    expect(result?.confidence?.price).toBeUndefined();
  });

  it("falls back to a plausible <img> candidate in the page body when there's no JSON-LD image or og:image", async () => {
    const html = `
      <html><body>
        <title>Navy Wool Blazer</title>
        <img src="https://cdn.retailer.com/assets/header-logo.png">
        <img src="https://cdn.retailer.com/products/blazer-detail.jpg">
      </body></html>
    `;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result?.imageUrl).toBe("https://cdn.retailer.com/products/blazer-detail.jpg");
    expect(result?.confidence?.imageUrl).toBe("low");
  });

  it("falls back to the <title> tag when there is no structured metadata at all", async () => {
    const html = `<html><head><title>Navy Wool Blazer - Retailer</title></head></html>`;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result?.itemName).toBe("Navy Wool Blazer - Retailer");
    expect(result?.confidence?.itemName).toBe("low");
    expect(result?.confidence?.price).toBeUndefined();
    expect(result?.confidence?.imageUrl).toBeUndefined();
  });

  it("returns null (never blocks) when the fetch fails outright", async () => {
    // A network error is retried (src/lib/retry.ts) before giving up, and
    // with no browser-worker configured in this test env, extraction has
    // nowhere else to fall back to - so every attempt must reject.
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result).toBeNull();
    expect(extractWardrobeItemTags).not.toHaveBeenCalled();
  });

  it("returns null when the response is not ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse("", false));

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result).toBeNull();
  });

  it("returns null when no item name can be found anywhere on the page", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse("<html><body>empty</body></html>"));

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result).toBeNull();
  });

  it("falls back to the browser worker when the plain fetch is blocked, and parses its rendered html the same way", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse("", false)); // bot-blocked: 403
    vi.mocked(fetchViaBrowserWorker).mockResolvedValueOnce(
      `<html><head><meta property="og:title" content="Navy Wool Blazer" /><meta property="og:image" content="https://cdn.retailer.com/blazer.jpg" /></head></html>`
    );
    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(fetchViaBrowserWorker).toHaveBeenCalledWith("https://retailer.com/blazer");
    expect(result?.itemName).toBe("Navy Wool Blazer");
    expect(result?.imageUrl).toBe("https://cdn.retailer.com/blazer.jpg");
  });

  it("never calls the browser worker when the plain fetch already found an item name", async () => {
    const html = `<html><head><title>Navy Wool Blazer</title></head></html>`;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

    await extractFromUrl("https://retailer.com/blazer");

    expect(fetchViaBrowserWorker).not.toHaveBeenCalled();
  });

  it("returns null when both the plain fetch and the browser worker fail to find an item", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse("", false));
    vi.mocked(fetchViaBrowserWorker).mockResolvedValueOnce(null);

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result).toBeNull();
  });

  it("still returns the found name/price/image with empty tags if tag extraction itself fails", async () => {
    const html = `<html><head><title>Navy Wool Blazer</title></head></html>`;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
    vi.mocked(extractWardrobeItemTags).mockRejectedValueOnce(new Error("model unavailable"));

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result?.itemName).toBe("Navy Wool Blazer");
    expect(result?.category).toBeNull();
    expect(result?.styleTags).toEqual([]);
  });
});
