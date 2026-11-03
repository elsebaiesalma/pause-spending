import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractJsonLdProduct, extractMetaContent, parsePriceValue, resolveUrl } from "./structuredData";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf8");
}

describe("parsePriceValue", () => {
  it.each([
    [189.99, 189.99],
    ["189.99", 189.99],
    ["$1,299.00", 1299],
    ["&#36;1,299.00", 1299],
    ["CA$ 189.99", 189.99],
    ["US$ 89", 89],
    ["1.299,00", 1299],
    ["49,90", 49.9],
    ["1,299", 1299],
    ["98 - 128", 98],
    ["From $98.00", 98],
  ])("reads %j as %j", (raw, expected) => {
    expect(parsePriceValue(raw)).toBe(expected);
  });

  it.each([[""], ["free"], [null], [undefined], [-5], [Number.NaN], [{}]])("returns null for %j", (raw) => {
    expect(parsePriceValue(raw)).toBeNull();
  });
});

describe("resolveUrl", () => {
  it("makes protocol-relative and root-relative addresses absolute", () => {
    expect(resolveUrl("//cdn.example.com/a.jpg", "https://shop.example.com/p/1")).toBe("https://cdn.example.com/a.jpg");
    expect(resolveUrl("/img/a.jpg", "https://shop.example.com/p/1")).toBe("https://shop.example.com/img/a.jpg");
  });

  it("returns null for empty values and inline data images", () => {
    expect(resolveUrl("", "https://shop.example.com")).toBeNull();
    expect(resolveUrl(undefined, "https://shop.example.com")).toBeNull();
    expect(resolveUrl("data:image/gif;base64,R0lGOD", "https://shop.example.com")).toBeNull();
  });
});

describe("extractMetaContent", () => {
  it("reads property, name and itemprop attributes in either attribute order", () => {
    const html = `
      <meta property="og:title" content="A &amp; B">
      <meta content="42.00" itemprop="price">
      <meta name="twitter:title" content="T">`;
    expect(extractMetaContent(html, "og:title")).toBe("A & B");
    expect(extractMetaContent(html, "price")).toBe("42.00");
    expect(extractMetaContent(html, "twitter:title")).toBe("T");
    expect(extractMetaContent(html, "og:image")).toBeNull();
  });
});

describe("extractJsonLdProduct", () => {
  it("reads a Product inside an @graph / ProductGroup with ImageObject and variant prices", () => {
    const result = extractJsonLdProduct(fixture("jsonld-graph-productgroup.html"));

    expect(result).toEqual({
      name: "Wool Overcoat",
      image: "https://images.maisonalder.example/overcoat-camel-front.jpg",
      price: 298,
      priceIsRange: true,
      currency: "CAD",
      brand: "Maison Alder",
    });
  });

  it("reads a typed array, ImageObject arrays (contentUrl and url) and priceSpecification", () => {
    const result = extractJsonLdProduct(fixture("jsonld-image-object-array.html"));

    expect(result?.name).toBe("Leather Ankle Boots");
    expect(result?.image).toBe("//media.halefootwear.example/boots-1.jpg");
    expect(result?.price).toBe(219);
    expect(result?.currency).toBe("USD");
    expect(result?.brand).toBe("Hale Footwear");
    expect(result?.priceIsRange).toBe(false);
  });

  it("uses lowPrice of an AggregateOffer and marks it as a range", () => {
    const result = extractJsonLdProduct(fixture("jsonld-aggregate-offer.html"));

    expect(result?.price).toBe(28);
    expect(result?.priceIsRange).toBe(true);
    expect(result?.currency).toBe("CAD");
  });

  it("decodes entities in the name and in an entity-encoded price", () => {
    const result = extractJsonLdProduct(fixture("jsonld-entity-price.html"));

    expect(result?.name).toBe("Cashmere Wrap Coat & Belt");
    expect(result?.price).toBe(1299);
    expect(result?.priceIsRange).toBe(false);
  });

  it("keeps working on the simple top-level Product shape", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Tee","offers":{"price":"20"}}</script>`;
    expect(extractJsonLdProduct(html)).toMatchObject({ name: "Tee", price: 20, priceIsRange: false });
  });

  it("skips invalid JSON blocks and returns null when there is no product", () => {
    expect(extractJsonLdProduct(`<script type="application/ld+json">{ not json</script>`)).toBeNull();
    expect(extractJsonLdProduct(`<script type="application/ld+json">{"@type":"Organization"}</script>`)).toBeNull();
    expect(extractJsonLdProduct("<html></html>")).toBeNull();
  });
});
