export type UrlExtraction = {
  itemName: string;
  price: number | null;
  imageUrl: string | null;
};

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

type JsonLdProduct = { name?: string; image?: string | string[]; price?: number };

function extractJsonLdProduct(html: string): JsonLdProduct | null {
  const scriptMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scriptMatches) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }

    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      const node = candidate as Record<string, unknown>;
      const type = node["@type"];
      const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
      if (!isProduct) continue;

      const offers = node.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
      const offer = Array.isArray(offers) ? offers[0] : offers;
      const price = offer?.price !== undefined ? Number(offer.price) : undefined;

      return {
        name: typeof node.name === "string" ? node.name : undefined,
        image: node.image as string | string[] | undefined,
        price: price !== undefined && !Number.isNaN(price) ? price : undefined,
      };
    }
  }

  return null;
}

function firstImage(image: string | string[] | undefined): string | null {
  if (!image) return null;
  return Array.isArray(image) ? image[0] ?? null : image;
}

function parsePriceFromMeta(html: string): number | null {
  const raw =
    extractMetaContent(html, "product:price:amount") ??
    extractMetaContent(html, "og:price:amount");
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

// Fetches a product page and scrapes structured metadata (JSON-LD Product
// schema, then Open Graph tags, then a bare <title> as a last resort).
// Returns null on any failure - fetch error, non-2xx response, or no
// identifiable item name - so the caller can fall back to manual entry
// rather than blocking, per the design's error handling.
export async function extractFromUrl(url: string): Promise<UrlExtraction | null> {
  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PauseBeforePurchaseBot/1.0; +https://github.com)",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      return null;
    }
    html = await response.text();
  } catch {
    return null;
  }

  const jsonLd = extractJsonLdProduct(html);
  const itemName = jsonLd?.name ?? extractMetaContent(html, "og:title") ?? extractTitleTag(html);
  if (!itemName) {
    return null;
  }

  const imageUrl = firstImage(jsonLd?.image) ?? extractMetaContent(html, "og:image");
  const price = jsonLd?.price ?? parsePriceFromMeta(html);

  return { itemName: itemName.trim(), price: price ?? null, imageUrl };
}
