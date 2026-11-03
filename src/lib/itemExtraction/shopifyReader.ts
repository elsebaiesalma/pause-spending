import { fetchWithRetry } from "@/lib/retry";
import { decodeHtmlEntities } from "@/lib/text";
import { resolveUrl } from "./structuredData";

// Every Shopify store serves a clean JSON copy of a product page at
// /products/<handle>.js. It has the exact title, the brand (vendor), every
// variant with its own price and photo, and it isn't hidden behind a
// rendered page, so it is the most reliable source there is for those
// stores. Anything that goes wrong here returns null and the caller carries
// on with the ordinary page reader.

export type ShopifyProduct = {
  itemName: string;
  brand: string | null;
  // In the store's own currency. The .js endpoint does not name it.
  price: number | null;
  imageUrl: string | null;
  // "high" when the price is the one the link points at (a ?variant= link,
  // or every variant costs the same), "medium" when it is the lowest of
  // several different prices.
  priceConfidence: "high" | "medium";
};

type ShopifyVariant = {
  id?: number | string;
  price?: number | string;
  available?: boolean;
  featured_image?: { src?: string } | null;
};

type ShopifyProductJson = {
  title?: string;
  vendor?: string;
  price?: number | string;
  featured_image?: string | null;
  images?: string[];
  variants?: ShopifyVariant[];
};

export type ShopifyLink = { origin: string; handle: string; variantId: string | null };

// Matches /products/<handle> and /collections/<collection>/products/<handle>,
// also behind a locale prefix such as /en-ca/products/<handle>.
export function parseShopifyProductUrl(url: string): ShopifyLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const match = parsed.pathname.match(/(?:^|\/)products\/([^/?#]+?)(?:\.js|\.json)?\/?$/);
  if (!match) return null;

  return {
    origin: parsed.origin,
    handle: match[1],
    variantId: parsed.searchParams.get("variant"),
  };
}

// Prices in the .js endpoint are whole cents, as numbers or numeric strings.
function centsToPrice(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const cents = Number(value);
  return Number.isFinite(cents) && cents >= 0 ? cents / 100 : null;
}

function readProduct(json: ShopifyProductJson, link: ShopifyLink): ShopifyProduct | null {
  const itemName = json.title ? decodeHtmlEntities(json.title).trim() : "";
  if (!itemName) return null;

  const variants = json.variants ?? [];
  const requested = link.variantId ? variants.find((v) => String(v.id) === link.variantId) : undefined;

  let price: number | null = null;
  let priceConfidence: ShopifyProduct["priceConfidence"] = "high";

  if (requested) {
    price = centsToPrice(requested.price);
  } else {
    // Without a ?variant= the link doesn't say which size or color the
    // shopper means, so use the lowest price among those in stock (all of
    // them if nothing is) and say so when the choice would matter.
    const inStock = variants.filter((v) => v.available !== false);
    const pool = inStock.length > 0 ? inStock : variants;
    const prices = pool.map((v) => centsToPrice(v.price)).filter((p): p is number => p !== null);
    if (prices.length > 0) {
      price = Math.min(...prices);
      if (new Set(prices).size > 1) priceConfidence = "medium";
    } else {
      price = centsToPrice(json.price);
    }
  }

  const raw = requested?.featured_image?.src ?? json.featured_image ?? json.images?.[0] ?? null;
  const imageUrl = resolveUrl(raw, link.origin);

  return {
    itemName,
    brand: json.vendor ? decodeHtmlEntities(json.vendor).trim() || null : null,
    price,
    imageUrl,
    priceConfidence,
  };
}

const SHOPIFY_FETCH_TIMEOUT_MS = 8000;

// Returns null for anything that isn't a readable Shopify product: not a
// product link, the store has switched the .js feed off, a non-JSON answer,
// or a network error.
export async function fetchShopifyProduct(url: string): Promise<ShopifyProduct | null> {
  const link = parseShopifyProductUrl(url);
  if (!link) return null;

  try {
    const response = await fetchWithRetry(
      `${link.origin}/products/${link.handle}.js`,
      {
        headers: { Accept: "application/json", "Accept-Language": "en-CA,en;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(SHOPIFY_FETCH_TIMEOUT_MS),
      },
      { maxAttempts: 2 }
    );
    if (!response.ok) return null;

    const json = (await response.json()) as ShopifyProductJson;
    if (!json || typeof json !== "object") return null;
    return readProduct(json, link);
  } catch {
    return null;
  }
}
