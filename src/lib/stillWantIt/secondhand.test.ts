import { describe, expect, it } from "vitest";
import { buildResaleSearchLinks } from "./secondhand";
import resaleSites from "./resaleSites.json";

describe("buildResaleSearchLinks", () => {
  it("builds one search link per site from brand and item name, URL-encoded", () => {
    const links = buildResaleSearchLinks("Acne Studios", "Suede Ankle Boots");

    expect(links).toHaveLength(resaleSites.length);
    expect(links[0].url).toContain(encodeURIComponent("Acne Studios Suede Ankle Boots"));
    expect(links.every((link) => link.url.startsWith("https://"))).toBe(true);
  });

  it("uses only the item name when there is no brand", () => {
    const [first] = buildResaleSearchLinks(null, "Linen Shorts");
    expect(first.url).toContain("Linen%20Shorts");
    expect(first.url).not.toContain("null");
  });

  it("returns no links when there is nothing to search for", () => {
    expect(buildResaleSearchLinks(null, null)).toEqual([]);
    expect(buildResaleSearchLinks("  ", "   ")).toEqual([]);
  });

  it("uses the sites it is given, so a new entry in the data file is picked up", () => {
    const links = buildResaleSearchLinks("Brand", "Thing", [{ name: "Example", searchUrl: "https://example.test/?q={query}" }]);
    expect(links).toEqual([{ name: "Example", url: "https://example.test/?q=Brand%20Thing" }]);
  });
});
