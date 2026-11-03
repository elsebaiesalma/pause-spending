import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchShopifyProduct, parseShopifyProductUrl } from "./shopifyReader";

const PRODUCT_JSON = JSON.parse(readFileSync(join(__dirname, "__fixtures__", "shopify-product.json"), "utf8"));

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 404, json: async () => body } as Response;
}

describe("parseShopifyProductUrl", () => {
  it("matches /products/<handle>, collection paths and locale prefixes", () => {
    expect(parseShopifyProductUrl("https://nuuvo.example/products/the-cloud-hoodie-set")).toEqual({
      origin: "https://nuuvo.example",
      handle: "the-cloud-hoodie-set",
      variantId: null,
    });
    expect(parseShopifyProductUrl("https://nuuvo.example/collections/sets/products/the-cloud-hoodie-set?variant=123")).toEqual({
      origin: "https://nuuvo.example",
      handle: "the-cloud-hoodie-set",
      variantId: "123",
    });
    expect(parseShopifyProductUrl("https://nuuvo.example/en-ca/products/the-cloud-hoodie-set/")?.handle).toBe(
      "the-cloud-hoodie-set"
    );
    expect(parseShopifyProductUrl("https://nuuvo.example/products/the-cloud-hoodie-set.js")?.handle).toBe(
      "the-cloud-hoodie-set"
    );
  });

  it("returns null for other paths and invalid input", () => {
    expect(parseShopifyProductUrl("https://retailer.com/blazer")).toBeNull();
    expect(parseShopifyProductUrl("https://retailer.com/products")).toBeNull();
    expect(parseShopifyProductUrl("https://retailer.com/p/products/a/b")).toBeNull();
    expect(parseShopifyProductUrl("not a url")).toBeNull();
    expect(parseShopifyProductUrl("ftp://nuuvo.example/products/x")).toBeNull();
  });
});

describe("fetchShopifyProduct", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks the store's .js feed and reads title, brand, lowest in-stock price and a normalized image", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse(PRODUCT_JSON));

    const result = await fetchShopifyProduct("https://nuuvo.example/products/the-cloud-hoodie-set");

    expect(fetchSpy.mock.calls[0][0]).toBe("https://nuuvo.example/products/the-cloud-hoodie-set.js");
    expect(result).toEqual({
      itemName: "The Cloud Hoodie & Jogger Set",
      brand: "Nuuvo Studio",
      // The $75 Sage / M variant is out of stock, so it is not the lowest.
      price: 89,
      imageUrl: "https://cdn.shopify.com/s/files/1/0042/1234/products/cloud-hoodie-oat.jpg?v=1698765432",
      priceConfidence: "medium",
    });
  });

  it("uses the price and photo of the variant named in ?variant=", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse(PRODUCT_JSON));

    const result = await fetchShopifyProduct(
      "https://nuuvo.example/products/the-cloud-hoodie-set?variant=41230000000002"
    );

    expect(result?.price).toBe(129);
    expect(result?.priceConfidence).toBe("high");
    expect(result?.imageUrl).toBe(
      "https://cdn.shopify.com/s/files/1/0042/1234/products/cloud-hoodie-black.jpg?v=1698765432"
    );
  });

  it("is confident in the price when every variant costs the same", async () => {
    const same = { ...PRODUCT_JSON, variants: PRODUCT_JSON.variants.map((v: object) => ({ ...v, price: "6400" })) };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse(same));

    const result = await fetchShopifyProduct("https://nuuvo.example/products/the-cloud-hoodie-set");

    expect(result?.price).toBe(64);
    expect(result?.priceConfidence).toBe("high");
  });

  it("falls back to the top-level price when there are no variants", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse({ title: "Tee", vendor: "", price: 2500, images: ["https://cdn.example/tee.jpg"] })
    );

    const result = await fetchShopifyProduct("https://nuuvo.example/products/tee");

    expect(result).toMatchObject({ itemName: "Tee", brand: null, price: 25, imageUrl: "https://cdn.example/tee.jpg" });
  });

  it("returns null without any request for a link that is not a product page", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    expect(await fetchShopifyProduct("https://retailer.com/blazer")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when the store has no .js feed, answers with junk, or errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse({}, false));
    expect(await fetchShopifyProduct("https://nuuvo.example/products/x")).toBeNull();

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    } as unknown as Response);
    expect(await fetchShopifyProduct("https://nuuvo.example/products/x")).toBeNull();

    vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse({ vendor: "No title" }));
    expect(await fetchShopifyProduct("https://nuuvo.example/products/x")).toBeNull();
  });
});
