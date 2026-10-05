import { describe, expect, it } from "vitest";
import { deriveQueryFromUrlSlug } from "./searchProduct";

describe("deriveQueryFromUrlSlug", () => {
  it("extracts a readable query from a hyphenated product slug, stripping a trailing letter-prefixed id", () => {
    expect(deriveQueryFromUrlSlug("https://zara.com/us/en/wool-coat-p12345.html")).toBe("wool coat");
  });

  it("prefers the longest path segment over short locale/category segments", () => {
    const query = deriveQueryFromUrlSlug("https://retailer.com/us/en/women/navy-wool-blazer-jacket");
    expect(query).toBe("navy wool blazer jacket");
  });

  it("returns null for an unparseable URL", () => {
    expect(deriveQueryFromUrlSlug("not a url")).toBeNull();
  });

  it("returns null when no path segment yields a usable query", () => {
    expect(deriveQueryFromUrlSlug("https://retailer.com/")).toBeNull();
  });

  it("strips underscores the same way as hyphens", () => {
    expect(deriveQueryFromUrlSlug("https://retailer.com/navy_wool_blazer")).toBe("navy wool blazer");
  });
});
