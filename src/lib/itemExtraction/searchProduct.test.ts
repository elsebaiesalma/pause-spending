import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./urlExtractor", () => ({
  extractFromUrl: vi.fn(),
}));

import { extractFromUrl } from "./urlExtractor";
import { searchForItem } from "./searchProduct";
import { _resetSearchCacheForTests } from "./searchCache";

function fakeExtraction(itemName: string) {
  return {
    itemName,
    price: 50,
    imageUrl: "https://cdn.example.com/img.jpg",
    category: "tops",
    colorName: "navy",
    colorFamily: "navy",
    styleTags: [],
  };
}

function braveResponse(results: { title: string; url: string }[]) {
  return { ok: true, json: async () => ({ web: { results } }) } as Response;
}

describe("searchForItem", () => {
  const originalKey = process.env.BRAVE_SEARCH_API_KEY;

  beforeEach(() => {
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    _resetSearchCacheForTests();
  });

  afterEach(() => {
    process.env.BRAVE_SEARCH_API_KEY = originalKey;
    vi.restoreAllMocks();
    vi.mocked(extractFromUrl).mockReset();
  });

  it("throws a clear error when BRAVE_SEARCH_API_KEY is unset", async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    await expect(searchForItem("navy blazer")).rejects.toThrow("BRAVE_SEARCH_API_KEY is not set");
  });

  it("scopes the query with site:<domain> when a known brand is detected", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(braveResponse([{ title: "Navy Blazer", url: "https://zara.com/x" }]));
    vi.mocked(extractFromUrl).mockResolvedValueOnce(fakeExtraction("Navy Blazer"));

    await searchForItem("zara navy blazer");

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const decoded = decodeURIComponent(calledUrl).replace(/\+/g, " ");
    expect(decoded).toContain("site:zara.com zara navy blazer");
  });

  it("does not scope the query when no known brand is detected", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(braveResponse([{ title: "Navy Blazer", url: "https://boutique.example.com/x" }]));
    vi.mocked(extractFromUrl).mockResolvedValueOnce(fakeExtraction("Navy Blazer"));

    await searchForItem("navy blazer from a tiny boutique nobody has heard of");

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(calledUrl)).not.toContain("site:");
  });

  it("retries unrestricted when a brand-scoped search returns zero results", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(braveResponse([]))
      .mockResolvedValueOnce(braveResponse([{ title: "Navy Blazer", url: "https://zara.com/x" }]));
    vi.mocked(extractFromUrl).mockResolvedValueOnce(fakeExtraction("Navy Blazer"));

    const result = await searchForItem("zara navy blazer");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const secondCallUrl = fetchSpy.mock.calls[1][0] as string;
    expect(decodeURIComponent(secondCallUrl)).not.toContain("site:");
    expect(result.candidates).toHaveLength(1);
  });

  it("falls back to Brave's own crawled title, at low confidence, when direct extraction fails outright", async () => {
    // Mirrors what real bot-blocking retailers (Aritzia/Zara) do: the direct
    // fetch fails entirely, but Brave's crawler (unblocked) still indexed
    // the real page title, which is still worth showing as a low-confidence
    // candidate rather than dropping the result to zero.
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      braveResponse([{ title: "Wool Coat - Black | Retailer", url: "https://retailer.com/blocked" }])
    );
    vi.mocked(extractFromUrl).mockResolvedValueOnce(null);

    const result = await searchForItem("wool coat retailer");

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].itemName).toBe("Wool Coat - Black");
    expect(result.candidates[0].price).toBeNull();
    expect(result.candidates[0].confidence).toEqual({ itemName: "low" });
  });

  it("falls back to Brave's title when the fetched page's extracted name shares no words with what Brave crawled - the wrong-page case", async () => {
    // Mirrors what Shein does in practice: the fetch returns 200 with a
    // generic homepage shell instead of the real product page, so
    // extraction "succeeds" but with clearly unrelated content.
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      braveResponse([{ title: "Khaki Flap Pocket Cargo Pants | Retailer", url: "https://retailer.com/pants" }])
    );
    vi.mocked(extractFromUrl).mockResolvedValueOnce(fakeExtraction("Shop Women's Clothing Online"));

    const result = await searchForItem("cargo pants retailer");

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].itemName).toBe("Khaki Flap Pocket Cargo Pants");
    expect(result.candidates[0].confidence).toEqual({ itemName: "low" });
  });

  it("keeps the real extraction when it plausibly matches what Brave crawled for that URL", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      braveResponse([{ title: "Navy Wool Blazer | Retailer", url: "https://retailer.com/blazer" }])
    );
    vi.mocked(extractFromUrl).mockResolvedValueOnce(fakeExtraction("Navy Wool Blazer"));

    const result = await searchForItem("navy wool blazer retailer");

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].price).toBe(50);
    expect(result.candidates[0].confidence).toBeUndefined();
  });

  it("ranks a title matching more query words ahead of a less specific one, regardless of Brave's original order", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      braveResponse([
        { title: "Short Wool Coat | Retailer", url: "https://retailer.com/category" },
        { title: "Regular Fit Wool Coat - Black | Retailer", url: "https://retailer.com/product" },
      ])
    );
    vi.mocked(extractFromUrl).mockResolvedValue(null);

    const result = await searchForItem("wool coat black");

    expect(result.candidates[0].itemName).toBe("Regular Fit Wool Coat - Black");
    expect(result.candidates[1].itemName).toBe("Short Wool Coat");
  });

  it("drops a result entirely when both extraction and the SERP title itself are unusable", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(braveResponse([{ title: "", url: "https://retailer.com/x" }]));
    vi.mocked(extractFromUrl).mockResolvedValueOnce(null);

    const result = await searchForItem("navy blazer retailer");

    expect(result.candidates).toHaveLength(0);
  });

  describe("category/listing pages are never candidates", () => {
    it("excludes a 'Shop X' title with no price and no confirmed Product schema", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        braveResponse([{ title: "Shop Cargo Pants | Retailer", url: "https://retailer.com/category" }])
      );
      vi.mocked(extractFromUrl).mockResolvedValueOnce(null);

      const result = await searchForItem("shein cargo pants");

      expect(result.candidates).toHaveLength(0);
    });

    it("excludes an 'X for Women' title with no price and no confirmed Product schema", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        braveResponse([{ title: "Wool Coats for Women | Retailer", url: "https://retailer.com/category" }])
      );
      vi.mocked(extractFromUrl).mockResolvedValueOnce(null);

      const result = await searchForItem("wool coat");

      expect(result.candidates).toHaveLength(0);
    });

    it("excludes a bare-plural title that adds nothing beyond the query's own words", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        braveResponse([{ title: "Cargo Pants | Retailer", url: "https://retailer.com/category" }])
      );
      vi.mocked(extractFromUrl).mockResolvedValueOnce(null);

      const result = await searchForItem("cargo pants");

      expect(result.candidates).toHaveLength(0);
    });

    it("excludes a listing page whose one extra word is a plural-category synonym of the query's own category noun (the real Shein regression: 'Batwing Sleeve Blouses' for a 't shirt' search)", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        braveResponse([{ title: "Batwing Sleeve Blouses | SHEIN USA", url: "https://us.shein.com/style/x.html" }])
      );
      vi.mocked(extractFromUrl).mockResolvedValueOnce(null);

      const result = await searchForItem("shein pale yellow batwing sleeve t shirt");

      expect(result.candidates).toHaveLength(0);
    });

    it("still keeps a real product title with only one extra word, as long as it doesn't end in a plural category noun", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        braveResponse([{ title: "Wilfred THE ONLY COAT | Aritzia", url: "https://aritzia.com/product/x.html" }])
      );
      vi.mocked(extractFromUrl).mockResolvedValueOnce(null);

      const result = await searchForItem("aritzia wilfred wool coat");

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].itemName).toBe("Wilfred THE ONLY COAT");
    });

    it("leaves candidates empty (never a category page) when every result in a search is category-like - manual entry is the fallback, not a wrong candidate", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        braveResponse([
          { title: "Shop Cargo Pants | Retailer", url: "https://retailer.com/a" },
          { title: "Cargo Pants for Men | Retailer", url: "https://retailer.com/b" },
        ])
      );
      vi.mocked(extractFromUrl).mockResolvedValue(null);

      const result = await searchForItem("cargo pants");

      expect(result.candidates).toEqual([]);
    });

    it("keeps a category-shaped title anyway when a real price was found - a genuine price is a strong enough signal on its own", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        braveResponse([{ title: "Cargo Pants | Retailer", url: "https://retailer.com/product" }])
      );
      vi.mocked(extractFromUrl).mockResolvedValueOnce({
        itemName: "Cargo Pants",
        price: 39.99,
        imageUrl: null,
        category: null,
        colorName: null,
        colorFamily: null,
        styleTags: [],
        confidence: { itemName: "medium" },
      });

      const result = await searchForItem("cargo pants");

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].price).toBe(39.99);
    });

    it("keeps a category-shaped title anyway when a confirmed schema.org Product was found", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        braveResponse([{ title: "Cargo Pants | Retailer", url: "https://retailer.com/product" }])
      );
      vi.mocked(extractFromUrl).mockResolvedValueOnce({
        itemName: "Cargo Pants",
        price: null,
        imageUrl: null,
        category: null,
        colorName: null,
        colorFamily: null,
        styleTags: [],
        confidence: { itemName: "high" },
      });

      const result = await searchForItem("cargo pants");

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].itemName).toBe("Cargo Pants");
    });
  });

  it("caches by normalized query string - a second identical (differently-cased/spaced) query doesn't re-hit the API", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(braveResponse([{ title: "Navy Blazer", url: "https://zara.com/x" }]));
    vi.mocked(extractFromUrl).mockResolvedValueOnce(fakeExtraction("Navy Blazer"));

    const first = await searchForItem("  Zara Navy Blazer  ");
    const second = await searchForItem("zara navy blazer");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("labels the result with the detected brand's canonical name, not the raw query text", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      braveResponse([{ title: "Navy Blazer", url: "https://zara.com/x" }])
    );
    vi.mocked(extractFromUrl).mockResolvedValueOnce(fakeExtraction("Navy Blazer"));

    const result = await searchForItem("ZARA navy blazer");

    expect(result.scopedToBrand).toBe("Zara");
  });

  it("returns scopedToBrand: null when no brand is detected", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(braveResponse([]));

    const result = await searchForItem("something with no known brand at all");

    expect(result.scopedToBrand).toBeNull();
  });
});
