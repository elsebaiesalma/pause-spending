import { extractImageCandidates } from "@/lib/emailExtraction/htmlUtils";
import { extractWardrobeItemTags } from "@/lib/tagging/llmTagger";
import { fetchWithRetry } from "@/lib/retry";
import { fetchViaBrowserWorker } from "./browserWorkerClient";
import { fetchShopifyProduct } from "./shopifyReader";
import { pickBestImage } from "./imageCheck";
import { extractWithClaude, type PageExtraction } from "./pageTextExtractor";
import {
  extractJsonLdProduct,
  extractMetaContent,
  extractTitleTag,
  parsePriceValue,
  resolveUrl,
} from "./structuredData";

export type FieldConfidence = "high" | "medium" | "low";

export type UrlExtraction = {
  itemName: string;
  price: number | null;
  imageUrl: string | null;
  category: string | null;
  colorName: string | null;
  colorFamily: string | null;
  styleTags: string[];
  // The store's brand when the page says it (Shopify "vendor", JSON-LD brand).
  brand?: string;
  // The price's currency code when the page states it. Never converted: a
  // price in another currency is shown as read.
  currency?: string;
  // Which source each field came from. "high" = the store's own product
  // data (Shopify feed, or a Product block naming one price); "medium" =
  // Open Graph tags, or a price that is the lowest of several; "low" = the
  // page <title>, an image picked out of the page body, or a value Claude
  // read from the page text. A field that wasn't found has no entry at all -
  // the UI shows "not found", not a guess.
  confidence?: Partial<Record<"itemName" | "price" | "imageUrl", FieldConfidence>>;
};

export type ExtractFromUrlOptions = {
  // Let Claude read the page text when the structured sources miss the name
  // or price. Off for bulk callers (the search path reads several pages at
  // once) so one paste costs at most one model call.
  aiFallback?: boolean;
};

type ParsedProductPage = {
  itemName: string;
  price: number | null;
  imageUrl: string | null;
  brand?: string;
  currency?: string;
  confidence: NonNullable<UrlExtraction["confidence"]>;
  // Set only when the photo came from the page body (not product data):
  // every plausible candidate, so the best one can be checked.
  bodyImageCandidates?: string[];
};

function parsePriceFromMeta(html: string): number | null {
  const raw = extractMetaContent(html, "product:price:amount") ?? extractMetaContent(html, "og:price:amount");
  return raw ? parsePriceValue(raw) : null;
}

function parseProductHtml(html: string, pageUrl: string): ParsedProductPage | null {
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

  let imageUrl = resolveUrl(jsonLd?.image, pageUrl);
  let bodyImageCandidates: string[] | undefined;
  if (imageUrl) {
    confidence.imageUrl = "high";
  } else {
    imageUrl = resolveUrl(extractMetaContent(html, "og:image"), pageUrl);
    if (imageUrl) {
      confidence.imageUrl = "medium";
    } else {
      const candidates = extractImageCandidates(html)
        .map((c) => resolveUrl(c.imageUrl, pageUrl))
        .filter((u): u is string => u !== null);
      imageUrl = candidates[0] ?? null;
      if (imageUrl) {
        confidence.imageUrl = "low";
        bodyImageCandidates = candidates;
      }
    }
  }

  let price = jsonLd?.price;
  if (price !== undefined) {
    // A range (AggregateOffer, or variants at different prices) means the
    // lowest is shown; it may not be the one the shopper wants.
    confidence.price = jsonLd?.priceIsRange ? "medium" : "high";
  } else {
    price = parsePriceFromMeta(html) ?? undefined;
    if (price !== undefined) confidence.price = "medium";
  }

  const metaCurrency = (
    extractMetaContent(html, "product:price:currency") ?? extractMetaContent(html, "og:price:currency")
  )
    ?.trim()
    .toUpperCase();
  const currency = jsonLd?.currency ?? metaCurrency;

  return {
    itemName: itemName.trim(),
    price: price ?? null,
    imageUrl,
    ...(jsonLd?.brand ? { brand: jsonLd.brand } : {}),
    ...(currency ? { currency } : {}),
    confidence,
    ...(bodyImageCandidates ? { bodyImageCandidates } : {}),
  };
}

// A normal desktop browser's identity. Many stores turn away anything that
// announces itself as a bot, and a request that looks like a browser gets
// the same page a shopper would.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-CA,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
};

const PAGE_FETCH_TIMEOUT_MS = 12000;

async function fetchProductHtml(url: string): Promise<string | null> {
  try {
    const response = await fetchWithRetry(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

// Claude is only asked when the structured sources came up short: no price,
// or a name that is just the page <title>.
function needsPageReading(parsed: ParsedProductPage | null): boolean {
  return !parsed || parsed.price === null || parsed.confidence.itemName === "low";
}

// Fills what the structured sources missed with what Claude read. Anything
// the page's own data already gave is kept; everything Claude adds is "low".
function mergeClaudeReading(parsed: ParsedProductPage | null, reading: PageExtraction | null): ParsedProductPage | null {
  if (!reading) return parsed;

  const merged: ParsedProductPage = parsed
    ? { ...parsed, confidence: { ...parsed.confidence } }
    : { itemName: "", price: null, imageUrl: null, confidence: {} };

  if (reading.itemName && (!parsed || parsed.confidence.itemName === "low")) {
    merged.itemName = reading.itemName;
    merged.confidence.itemName = "low";
  }
  if (merged.price === null && reading.price !== null) {
    merged.price = reading.price;
    merged.confidence.price = "low";
  }
  if (!merged.imageUrl && reading.imageUrl) {
    merged.imageUrl = reading.imageUrl;
    merged.confidence.imageUrl = "low";
  }
  if (!merged.currency && reading.currency) merged.currency = reading.currency;

  return merged.itemName ? merged : null;
}

// Reads a pasted product link, trying the most reliable source first:
//   1. Shopify's own product feed (/products/<handle>.js) for Shopify stores.
//   2. The page itself, fetched like a browser: product data (JSON-LD), then
//      Open Graph tags, then the page <title>.
//   3. A rendered copy of the page from the browser-worker, when the plain
//      fetch is blocked or comes back empty (needs BROWSER_WORKER_URL).
//   4. Claude reading the page text, when there is still no price or only a
//      <title> for a name.
// Returns null when no source finds an item name, so the caller falls back
// to manual entry rather than blocking or fabricating data.
export async function extractFromUrl(
  url: string,
  options: ExtractFromUrlOptions = {}
): Promise<UrlExtraction | null> {
  const { aiFallback = true } = options;

  let parsed: ParsedProductPage | null = null;

  const shopify = await fetchShopifyProduct(url);
  if (shopify && shopify.price !== null) {
    parsed = {
      itemName: shopify.itemName,
      price: shopify.price,
      imageUrl: shopify.imageUrl,
      ...(shopify.brand ? { brand: shopify.brand } : {}),
      confidence: {
        itemName: "high",
        price: shopify.priceConfidence,
        ...(shopify.imageUrl ? { imageUrl: "high" as const } : {}),
      },
    };
  }

  if (!parsed) {
    let sourceHtml = await fetchProductHtml(url);
    parsed = sourceHtml ? parseProductHtml(sourceHtml, url) : null;

    if (!parsed) {
      const renderedHtml = await fetchViaBrowserWorker(url);
      parsed = renderedHtml ? parseProductHtml(renderedHtml, url) : null;
      sourceHtml = renderedHtml ?? sourceHtml;
    }

    if (aiFallback && sourceHtml && needsPageReading(parsed)) {
      parsed = mergeClaudeReading(parsed, await extractWithClaude(sourceHtml, url));
    }

    // Several plausible photos and none from product data: check each one's
    // real size and keep the biggest acceptable, rather than the first.
    if (
      parsed?.bodyImageCandidates &&
      parsed.bodyImageCandidates.length > 1 &&
      parsed.confidence.imageUrl === "low"
    ) {
      const best = await pickBestImage(parsed.bodyImageCandidates);
      if (best) parsed.imageUrl = best;
    }
  }

  if (!parsed) {
    return null;
  }

  const tags = await extractItemTags(parsed.itemName, parsed.imageUrl);

  return {
    itemName: parsed.itemName,
    price: parsed.price,
    imageUrl: parsed.imageUrl,
    ...(parsed.brand ? { brand: parsed.brand } : {}),
    ...(parsed.currency ? { currency: parsed.currency } : {}),
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
