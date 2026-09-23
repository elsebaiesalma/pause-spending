import { afterEach, describe, expect, it, vi } from "vitest";
import { extractFromUrl } from "./urlExtractor";

function fakeResponse(html: string, ok = true) {
  return {
    ok,
    text: async () => html,
  } as Response;
}

describe("extractFromUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts name/price/image from JSON-LD Product schema when present", async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type": "Product", "name": "Navy Wool Blazer", "image": "https://cdn.retailer.com/blazer.jpg", "offers": {"price": "189.99"}}
        </script>
        <meta property="og:title" content="Wrong Title" />
      </head></html>
    `;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result).toEqual({
      itemName: "Navy Wool Blazer",
      price: 189.99,
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

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result).toEqual({
      itemName: "Navy Wool Blazer",
      price: null,
      imageUrl: "https://cdn.retailer.com/blazer.jpg",
    });
  });

  it("falls back to the <title> tag when there is no structured metadata at all", async () => {
    const html = `<html><head><title>Navy Wool Blazer - Retailer</title></head></html>`;
    vi.spyOn(global, "fetch").mockResolvedValueOnce(fakeResponse(html));

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result?.itemName).toBe("Navy Wool Blazer - Retailer");
  });

  it("returns null (never blocks) when the fetch fails outright", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("network error"));

    const result = await extractFromUrl("https://retailer.com/blazer");

    expect(result).toBeNull();
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
});
