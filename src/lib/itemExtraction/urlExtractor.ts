import { extractImageCandidates } from "@/lib/emailExtraction/htmlUtils";
import { extractWardrobeItemTags } from "@/lib/tagging/llmTagger";
import { fetchWithRetry } from "@/lib/retry";
import { decodeHtmlEntities } from "@/lib/text";
import { fetchViaBrowserWorker } from "./browserWorkerClient";

export type FieldConfidence = "high" | "medium" | "low";

export type UrlExtraction = {
  itemName: string;
  price: number | null;
  imageUrl: string | null;
  category: string | null;
  colorName: string | null;
  colorFamily: string | null;
  styleTags: string[];
  // Only set by the search path (see searchProduct.ts) - URL paste doesn't
  // need it, since the user already knows which single page they pasted.
  // "high" = structured Product schema; "medium" = Open Graph tags; "low" =
  // bare <title>/scraped fallback. Absent field (price/imageUrl not found)
  // has no confidence entry at all - the UI shows "not found", not a guess.
  confidence?: Partial<Record<"itemName" | "price" | "imageUrl", FieldConfidence>>;
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
    if (match) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
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
        name: typeof node.name === "string" ? decodeHtmlEntities(node.name) : undefined,
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

type ParsedProductPage = {
  itemName: string;
  price: number | null;
  imageUrl: string | null;
  confidence: NonNullable<UrlExtraction["confidence"]>;
};

// The one parser both the cheap fetch path and the browser-worker fallback
// feed through, so whichever path supplied the HTML produces the exact same
// shape (JSON-LD Product schema, then Open Graph tags, then a bare <title>
// as a last resort; the image specifically also falls back to a scan of
// plausible <img> candidates in the page body, reusing the same heuristic
// the email pipeline uses to skip site chrome like logos/nav banners).
// Each field's confidence reflects which of those layers actually supplied
// it - a field that isn't found at all gets no confidence entry, since
// "not found" and "found with low confidence" mean different things to the
// UI (a quiet "price not found" vs. an explicit low-confidence flag).
// Returns null when no identifiable item name is present.
function parseProductHtml(html: string): ParsedProductPage | null {
  const jsonLd = extractJsonLdProduct(html);
  const confidence: NonNullable<UrlExtraction["confidence"]> = {};

  let itemName = jsonLd?.name;
  if (itemName) {
    confidence.itemName = "high";
  } else {
    itemName = extractMetaContent(html, "og:title") ?? undefined;
    if (itemName) {
      confidence.itemName = "medium";
    } else {
      itemName = extractTitleTag(html) ?? undefined;
      if (itemName) confidence.itemName = "low";
    }
  }
  if (!itemName) {
    return null;
  }

  let imageUrl = firstImage(jsonLd?.image);
  if (imageUrl) {
    confidence.imageUrl = "high";
  } else {
    imageUrl = extractMetaContent(html, "og:image");
    if (imageUrl) {
      confidence.imageUrl = "medium";
    } else {
      imageUrl = extractImageCandidates(html)[0]?.imageUrl ?? null;
      if (imageUrl) confidence.imageUrl = "low";
    }
  }

  let price = jsonLd?.price;
  if (price !== undefined) {
    confidence.price = "high";
  } else {
    price = parsePriceFromMeta(html) ?? undefined;
    if (price !== undefined) confidence.price = "medium";
  }

  return { itemName: itemName.trim(), price: price ?? null, imageUrl, confidence };
}

// Cheap path: a plain fetch with a realistic User-Agent. Returns null on
// any failure - network error, non-2xx response (bot-blocking retailers
// typically return 403/429 here) - so the caller can fall back to the
// browser-worker path rather than giving up immediately.
async function fetchProductHtml(url: string): Promise<string | null> {
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PauseBeforePurchaseBot/1.0; +https://github.com)",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

// Fetches a product page and scrapes structured metadata. Tries the cheap
// plain-fetch path first; when that fails outright (network error, non-2xx
// - the shape of a bot-blocking retailer's response) or succeeds but the
// page has no identifiable product data (a retailer that serves a
// JS-rendered shell to non-browser requests), falls back to the Playwright
// browser-worker for a real rendered page. Returns null when neither path
// finds an item name, so the caller falls back to manual entry rather than
// blocking or fabricating data, per the design's error handling.
export async function extractFromUrl(url: string): Promise<UrlExtraction | null> {
  const html = await fetchProductHtml(url);
  let parsed = html ? parseProductHtml(html) : null;

  if (!parsed) {
    const renderedHtml = await fetchViaBrowserWorker(url);
    parsed = renderedHtml ? parseProductHtml(renderedHtml) : null;
  }

  if (!parsed) {
    return null;
  }

  const tags = await extractItemTags(parsed.itemName, parsed.imageUrl);

  return {
    itemName: parsed.itemName,
    price: parsed.price,
    imageUrl: parsed.imageUrl,
    confidence: parsed.confidence,
    ...tags,
  };
}

// Reuses the same tag-extraction call the wardrobe uses (Step 11) so a
// desired item pulled from a URL already has real style/color/category
// data to show for confirmation, instead of leaving those blank until the
// pause screen tags it later. A tagging failure must never block getting
// to the confirmation screen with the name/price/image already found, so
// this degrades to "no tags yet" (picked up by the pause screen's own
// tagging pass) rather than throwing.
async function extractItemTags(
  itemName: string,
  imageUrl: string | null
): Promise<Pick<UrlExtraction, "category" | "colorName" | "colorFamily" | "styleTags">> {
  try {
    const tags = await extractWardrobeItemTags({ itemName, category: null, imageUrl });
    return {
      category: tags.category,
      colorName: tags.colorName,
      colorFamily: tags.colorFamily,
      styleTags: tags.styleTags,
    };
  } catch (error) {
    console.warn(`Tag extraction failed for URL-sourced item "${itemName}":`, error instanceof Error ? error.message : error);
    return { category: null, colorName: null, colorFamily: null, styleTags: [] };
  }
}
