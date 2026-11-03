import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tagging/llmTagger", () => ({
  extractWardrobeItemTags: vi.fn(),
}));

vi.mock("./browserWorkerClient", () => ({
  fetchViaBrowserWorker: vi.fn(),
}));

// The three new sources are mocked so these tests never reach the network or
// a model; their own behaviour is covered in their own test files. Each
// returns undefined by default, which the extractor treats as "found nothing".
vi.mock("./shopifyReader", () => ({
  fetchShopifyProduct: vi.fn(),
}));

vi.mock("./pageTextExtractor", () => ({
  extractWithClaude: vi.fn(),
}));

vi.mock("./imageCheck", () => ({
  pickBestImage: vi.fn(),
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractWardrobeItemTags, type WardrobeItemTags } from "@/lib/tagging/llmTagger";
import { fetchViaBrowserWorker } from "./browserWorkerClient";
import { pickBestImage } from "./imageCheck";
import { extractWithClaude } from "./pageTextExtractor";
import { fetchShopifyProduct } from "./shopifyReader";
import { extractFromUrl } from "./urlExtractor";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf8");
}

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
    vi.mocked(fetchShopifyProduct).mockReset();
    vi.mocked(extractWithClaude).mockReset();
    vi.mocked(pickBestImage).mockReset();
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

  describe("Shopify feed", () => {
    it("uses the store's own product data and never fetches the page", async () => {
      vi.mocked(fetchShopifyProduct).mockResolvedValueOnce({
        itemName: "The Cloud Hoodie & Jogger Set",
        brand: "Nuuvo Studio",
        price: 89,
        imageUrl: "https://cdn.shopify.com/cloud.jpg",
        priceConfidence: "medium",
      });
      const fetchSpy = vi.spyOn(global, "fetch");
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      const result = await extractFromUrl("https://nuuvo.example/products/the-cloud-hoodie-set");

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(extractWithClaude).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        itemName: "The Cloud Hoodie & Jogger Set",
        brand: "Nuuvo Studio",
        price: 89,
        imageUrl: "https://cdn.shopify.com/cloud.jpg",
        confidence: { itemName: "high", price: "medium", imageUrl: "high" },
      });
    });

    it("falls back to the page when the feed finds nothing", async () => {
      vi.mocked(fetchShopifyProduct).mockResolvedValueOnce(null);
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(fixture("jsonld-aggregate-offer.html")));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      const result = await extractFromUrl("https://nuuvo.example/products/x");

      expect(result?.price).toBe(28);
    });
  });

  describe("stronger JSON-LD and currency", () => {
    it("reads a ProductGroup inside an @graph with the lowest variant price as 'medium', plus brand and currency", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(fixture("jsonld-graph-productgroup.html")));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      const result = await extractFromUrl("https://maisonalder.example/products/wool-overcoat");

      expect(result).toMatchObject({
        itemName: "Wool Overcoat",
        price: 298,
        imageUrl: "https://images.maisonalder.example/overcoat-camel-front.jpg",
        brand: "Maison Alder",
        currency: "CAD",
        confidence: { itemName: "high", price: "medium", imageUrl: "high" },
      });
      expect(extractWithClaude).not.toHaveBeenCalled();
    });

    it("makes a protocol-relative ImageObject address absolute and keeps the currency in its own code", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(fixture("jsonld-image-object-array.html")));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      const result = await extractFromUrl("https://halefootwear.example/boots");

      expect(result?.imageUrl).toBe("https://media.halefootwear.example/boots-1.jpg");
      expect(result?.price).toBe(219);
      expect(result?.currency).toBe("USD");
    });

    it("decodes an entity-encoded price and name", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(fixture("jsonld-entity-price.html")));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      const result = await extractFromUrl("https://coats.example/wrap");

      expect(result?.itemName).toBe("Cashmere Wrap Coat & Belt");
      expect(result?.price).toBe(1299);
    });

    it("takes the currency from og:price:currency when there is no structured product", async () => {
      const html = `<html><head>
        <meta property="og:title" content="Navy Wool Blazer" />
        <meta property="og:price:amount" content="189.99" />
        <meta property="og:price:currency" content="cad" />
      </head></html>`;
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      const result = await extractFromUrl("https://retailer.com/blazer");

      expect(result?.price).toBe(189.99);
      expect(result?.currency).toBe("CAD");
      expect(result?.confidence?.price).toBe("medium");
    });

    it("leaves brand and currency out entirely when the page does not state them", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(`<html><head><title>Plain Tee</title></head></html>`));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      const result = await extractFromUrl("https://retailer.com/tee");

      expect(result).not.toHaveProperty("brand");
      expect(result).not.toHaveProperty("currency");
    });
  });

  describe("request headers", () => {
    it("fetches the page like a desktop browser", async () => {
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(fakeResponse(`<html><head><title>Plain Tee</title></head></html>`));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      await extractFromUrl("https://retailer.com/tee");

      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers["User-Agent"]).toMatch(/Chrome\/\d+/);
      expect(headers["User-Agent"]).not.toMatch(/bot/i);
      expect(headers["Accept-Language"]).toBe("en-CA,en;q=0.9");
      expect(headers.Accept).toContain("text/html");
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("Claude text fallback", () => {
    it("reads the page text when there is no structured data, marking every field it filled 'low'", async () => {
      const html = fixture("no-structured-data.html");
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);
      vi.mocked(extractWithClaude).mockResolvedValueOnce({
        itemName: "Pleated Midi Skirt",
        price: 84,
        currency: "CAD",
        imageUrl: null,
      });

      const result = await extractFromUrl("https://www.fableandthread.example/products/pleated-midi-skirt");

      expect(extractWithClaude).toHaveBeenCalledWith(html, "https://www.fableandthread.example/products/pleated-midi-skirt");
      expect(result).toMatchObject({
        itemName: "Pleated Midi Skirt",
        price: 84,
        currency: "CAD",
        imageUrl: "https://static.fableandthread.example/skirt-hero.jpg",
        confidence: { itemName: "low", price: "low", imageUrl: "medium" },
      });
    });

    it("does not call Claude when the page's own data already gave a name and a price", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(fixture("jsonld-entity-price.html")));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      await extractFromUrl("https://coats.example/wrap");

      expect(extractWithClaude).not.toHaveBeenCalled();
    });

    it("keeps the page's own name and image and only adds the missing price", async () => {
      const html = `<html><head>
        <meta property="og:title" content="Navy Wool Blazer" />
        <meta property="og:image" content="https://cdn.retailer.com/blazer.jpg" />
      </head></html>`;
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);
      vi.mocked(extractWithClaude).mockResolvedValueOnce({
        itemName: "Something Else Entirely",
        price: 189,
        currency: null,
        imageUrl: "https://cdn.retailer.com/other.jpg",
      });

      const result = await extractFromUrl("https://retailer.com/blazer");

      expect(result).toMatchObject({
        itemName: "Navy Wool Blazer",
        price: 189,
        imageUrl: "https://cdn.retailer.com/blazer.jpg",
        confidence: { itemName: "medium", price: "low", imageUrl: "medium" },
      });
    });

    it("is skipped with aiFallback: false (the search path), leaving the price unfound", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(fixture("no-structured-data.html")));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      const result = await extractFromUrl("https://www.fableandthread.example/p", { aiFallback: false });

      expect(extractWithClaude).not.toHaveBeenCalled();
      expect(result?.price).toBeNull();
    });

    it("returns what the page gave when Claude finds nothing", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(`<html><head><title>Plain Tee</title></head></html>`));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);
      vi.mocked(extractWithClaude).mockResolvedValueOnce(null);

      const result = await extractFromUrl("https://retailer.com/tee");

      expect(result?.itemName).toBe("Plain Tee");
      expect(result?.confidence?.itemName).toBe("low");
    });
  });

  describe("image check", () => {
    const BODY_IMAGES_HTML = `<html><body>
      <title>Navy Wool Blazer</title>
      <img src="https://cdn.retailer.com/products/blazer-detail.jpg">
      <img src="https://cdn.retailer.com/products/blazer-front.jpg">
    </body></html>`;

    it("replaces a body-picked photo with the best verified candidate", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(BODY_IMAGES_HTML));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);
      vi.mocked(pickBestImage).mockResolvedValueOnce("https://cdn.retailer.com/products/blazer-front.jpg");

      const result = await extractFromUrl("https://retailer.com/blazer", { aiFallback: false });

      expect(pickBestImage).toHaveBeenCalledWith([
        "https://cdn.retailer.com/products/blazer-detail.jpg",
        "https://cdn.retailer.com/products/blazer-front.jpg",
      ]);
      expect(result?.imageUrl).toBe("https://cdn.retailer.com/products/blazer-front.jpg");
      expect(result?.confidence?.imageUrl).toBe("low");
    });

    it("keeps the first candidate when none can be verified", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(BODY_IMAGES_HTML));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);
      vi.mocked(pickBestImage).mockResolvedValueOnce(null);

      const result = await extractFromUrl("https://retailer.com/blazer", { aiFallback: false });

      expect(result?.imageUrl).toBe("https://cdn.retailer.com/products/blazer-detail.jpg");
    });

    it("is not run when the photo came from product data or Open Graph", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(fixture("jsonld-graph-productgroup.html")));
      vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce(FAKE_TAGS);

      await extractFromUrl("https://maisonalder.example/products/wool-overcoat");

      expect(pickBestImage).not.toHaveBeenCalled();
    });
  });
});
