import { decodeHtmlEntities } from "@/lib/text";

// Reading the structured product data a store publishes for search engines
// (JSON-LD) and for social previews (Open Graph). Kept apart from the
// fetching so each shape a real store uses can be tested on its own.

export type JsonLdProduct = {
  name?: string;
  image?: string;
  price?: number;
  // True when the page states a range (AggregateOffer low/high, or variants
  // with different prices), so `price` is the lowest and may not be the one
  // the shopper is looking at.
  priceIsRange?: boolean;
  currency?: string;
  brand?: string;
};

// Turns whatever a store wrote as a price into a number, or null when it
// can't be read with confidence. Handles numbers, "$1,299.00", "&#36;1,299.00",
// "CA$ 189.99", "1.299,00" and "98 - 128" (the first number is used).
export function parsePriceValue(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw !== "string") return null;

  const decoded = decodeHtmlEntities(raw).replace(/[  ]/g, " ");
  const token = decoded.match(/\d[\d,.]*/)?.[0];
  if (!token) return null;

  const hasDot = token.includes(".");
  const hasComma = token.includes(",");
  let normalized = token;
  if (hasDot && hasComma) {
    // Whichever separator comes last is the decimal point.
    const decimalIsComma = token.lastIndexOf(",") > token.lastIndexOf(".");
    normalized = decimalIsComma ? token.replace(/\./g, "").replace(",", ".") : token.replace(/,/g, "");
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+$/.test(token)) {
      normalized = token.replace(/,/g, "");
    } else if (/,\d{1,2}$/.test(token)) {
      normalized = token.replace(",", ".");
    } else {
      normalized = token.replace(/,/g, "");
    }
  }
  normalized = normalized.replace(/\.$/, "");

  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

// Makes an image or link address absolute against the page it came from
// (stores often write "//cdn.example.com/a.jpg" or "/cdn/a.jpg"). Returns
// null for empty values and inline data: images, which are never a photo
// worth keeping.
export function resolveUrl(raw: string | null | undefined, base: string): string | null {
  const value = raw?.trim();
  if (!value || value.startsWith("data:")) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export function extractMetaContent(html: string, key: string): string | null {
  const attr = "(?:property|name|itemprop)";
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return null;
}

export function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// "Product", "schema:Product" and "https://schema.org/Product" all mean the
// same thing.
function typeNames(node: JsonObject): string[] {
  const raw = node["@type"];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.split(/[/:#]/).pop() ?? t);
}

const MAX_DEPTH = 8;

// Finds every Product / ProductGroup node anywhere in the page's JSON-LD:
// top level, inside an @graph, inside mainEntity, and so on.
function collectProductNodes(value: unknown, out: JsonObject[], depth = 0): void {
  if (depth > MAX_DEPTH) return;
  if (Array.isArray(value)) {
    for (const item of value) collectProductNodes(item, out, depth + 1);
    return;
  }
  if (!isObject(value)) return;

  const types = typeNames(value);
  if (types.includes("Product") || types.includes("ProductGroup")) {
    out.push(value);
  }
  for (const child of Object.values(value)) {
    if (typeof child === "object" && child !== null) collectProductNodes(child, out, depth + 1);
  }
}

// An image may be a plain address, an ImageObject, or an array of either.
function imageFrom(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = imageFrom(item);
      if (found) return found;
    }
    return undefined;
  }
  if (isObject(value)) {
    for (const key of ["url", "contentUrl", "@id"]) {
      const candidate = value[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }
  return undefined;
}

function brandFrom(value: unknown): string | undefined {
  if (typeof value === "string") return decodeHtmlEntities(value).trim() || undefined;
  if (isObject(value) && typeof value.name === "string") {
    return decodeHtmlEntities(value.name).trim() || undefined;
  }
  return undefined;
}

type OfferReading = { prices: number[]; currency?: string; isRange: boolean };

// Offer, AggregateOffer, an array of either, or a price held inside a
// priceSpecification.
function readOffers(offers: unknown): OfferReading {
  const prices: number[] = [];
  let currency: string | undefined;
  let isRange = false;

  const visit = (offer: unknown) => {
    if (Array.isArray(offer)) {
      for (const item of offer) visit(item);
      return;
    }
    if (!isObject(offer)) return;

    const spec = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification;
    const specObject = isObject(spec) ? spec : undefined;

    const low = parsePriceValue(offer.lowPrice);
    const high = parsePriceValue(offer.highPrice);
    const single = parsePriceValue(offer.price ?? specObject?.price);

    if (low !== null) {
      prices.push(low);
      if (high !== null && high !== low) isRange = true;
    }
    if (single !== null) prices.push(single);

    const code = offer.priceCurrency ?? specObject?.priceCurrency;
    if (!currency && typeof code === "string" && code.trim()) currency = code.trim().toUpperCase();

    if (offer.offers) visit(offer.offers);
  };

  visit(offers);
  return { prices, currency, isRange };
}

export function extractJsonLdProduct(html: string): JsonLdProduct | null {
  const nodes: JsonObject[] = [];
  const scriptMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of scriptMatches) {
    try {
      collectProductNodes(JSON.parse(match[1]), nodes);
    } catch {
      continue;
    }
  }
  if (nodes.length === 0) return null;

  // The page's own product is the group when there is one; otherwise the
  // first Product that isn't just a variant listed inside something else.
  const primary =
    nodes.find((n) => typeNames(n).includes("ProductGroup")) ??
    nodes.find((n) => !n.isVariantOf) ??
    nodes[0];

  const variants = Array.isArray(primary.hasVariant) ? primary.hasVariant.filter(isObject) : [];
  const priceSources: unknown[] = [primary.offers, ...variants.map((v) => v.offers)];
  const reading = readOffers(priceSources);

  const distinct = new Set(reading.prices);
  const price = reading.prices.length > 0 ? Math.min(...reading.prices) : undefined;

  return {
    name: typeof primary.name === "string" ? decodeHtmlEntities(primary.name).trim() || undefined : undefined,
    image: imageFrom(primary.image) ?? variants.map((v) => imageFrom(v.image)).find(Boolean),
    price,
    priceIsRange: reading.isRange || distinct.size > 1,
    currency: reading.currency,
    brand: brandFrom(primary.brand),
  };
}
