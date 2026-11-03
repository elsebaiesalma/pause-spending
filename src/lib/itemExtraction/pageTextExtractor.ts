import { URL_EXTRACTION_MODEL } from "@/lib/anthropicModels";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";
import { decodeHtmlEntities } from "@/lib/text";
import { isPlausibleProductImage } from "@/lib/emailExtraction/htmlUtils";
import { extractMetaContent, extractTitleTag, resolveUrl } from "./structuredData";

// Last resort for a product page with no usable structured data: turn the
// page into readable text, list its large images, and ask Claude which name,
// price and photo belong to the main product. Everything here is non-fatal;
// any failure returns null and the person fills the details in by hand.

const MAX_TEXT_LENGTH = 12000;
const HEAD_TEXT_LENGTH = 9000;
const MAX_IMAGE_CANDIDATES = 8;
const MIN_IMAGE_SIDE = 300;

const PRICE_LINE = /(?:[$€£¥]|\b(?:USD|CAD|EUR|GBP|AUD)\b)\s?\d|\d[\d.,]*\s?(?:[$€£]|\b(?:USD|CAD|EUR|GBP)\b)/i;

// Strips everything that isn't the product's own content (scripts, menus,
// footers, icons) and keeps one line per block, so a heading, a price and
// a description each stay on their own line.
export function htmlToReadableText(html: string): string {
  const withoutChrome = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|template|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(head)\b[\s\S]*?<\/\1>/gi, " ");

  const lines = decodeHtmlEntities(
    withoutChrome
      .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article|\/ul|\/ol|\/table|\/button|\/label)\b[^>]*>/gi, "\n")
      .replace(/<(p|div|li|tr|h[1-6]|section|article|ul|ol|table)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[  ]/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line, i, all) => line.length > 0 && line !== all[i - 1]);

  const text = lines.join("\n");
  if (text.length <= MAX_TEXT_LENGTH) return text;

  // The product name and price are normally near the top, but a long page
  // can push a price line past the cut, so keep price-looking lines from the
  // rest as well.
  const head = text.slice(0, HEAD_TEXT_LENGTH);
  const rest = text.slice(HEAD_TEXT_LENGTH);
  const priceLines = rest
    .split("\n")
    .filter((line) => line.length < 160 && PRICE_LINE.test(line))
    .join("\n")
    .slice(0, MAX_TEXT_LENGTH - HEAD_TEXT_LENGTH - 1);
  return priceLines ? `${head}\n${priceLines}` : head;
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, "i"));
  return match ? decodeHtmlEntities(match[1]) : null;
}

// The widest image a srcset offers ("a.jpg 400w, b.jpg 1200w" gives b.jpg).
function widestFromSrcset(srcset: string): string | null {
  let best: { url: string; width: number } | null = null;
  for (const part of srcset.split(",")) {
    const [url, descriptor] = part.trim().split(/\s+/);
    if (!url) continue;
    const width = descriptor?.endsWith("w") ? Number(descriptor.slice(0, -1)) : 0;
    if (!best || width > best.width) best = { url, width };
  }
  return best?.url ?? null;
}

// Large product-looking images, in page order. Looks at lazy-loaded
// (data-src) and responsive (srcset) images too, and skips logos, icons and
// anything declared smaller than MIN_IMAGE_SIDE.
export function collectLargeImageCandidates(html: string, baseUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (out.length >= MAX_IMAGE_CANDIDATES) break;
    const tag = match[0];

    const srcset = attr(tag, "srcset") ?? attr(tag, "data-srcset");
    const raw = (srcset ? widestFromSrcset(srcset) : null) ?? attr(tag, "data-src") ?? attr(tag, "src");
    const url = resolveUrl(raw, baseUrl);
    if (!url || seen.has(url)) continue;

    const width = Number(attr(tag, "width"));
    const height = Number(attr(tag, "height"));
    if ((width && width < MIN_IMAGE_SIDE) || (height && height < MIN_IMAGE_SIDE)) continue;
    if (!isPlausibleProductImage(url, tag)) continue;

    seen.add(url);
    out.push(url);
  }

  // The share-preview image is usually the main product photo; offer it first.
  const og = resolveUrl(extractMetaContent(html, "og:image"), baseUrl);
  if (og && !seen.has(og)) out.unshift(og);

  return out.slice(0, MAX_IMAGE_CANDIDATES);
}

const PageSchema = z.object({
  itemName: z
    .string()
    .nullable()
    .describe(
      "The name of the single main product this page is selling, without the store name or category breadcrumbs. Null if the page is not a product page or no product can be identified."
    ),
  price: z
    .number()
    .nonnegative()
    .nullable()
    .describe(
      "The current price actually charged for the main product, as a plain number. If a sale price and a struck-through original price are both shown, the sale price. If prices differ by size or color and the page does not say which is selected, the lowest. Never a total, a shipping threshold or a price from a recommended item. Null if you cannot tell."
    ),
  currency: z
    .string()
    .nullable()
    .describe("The three-letter currency code if the page states or clearly implies it (e.g. 'CAD', 'USD'). Null if unclear."),
  imageIndex: z
    .number()
    .int()
    .nullable()
    .describe(
      "The 1-based index, from the numbered image list, of the main photo of this product. Null if none of the candidates clearly shows it. Never a number outside the list."
    ),
});

const SYSTEM_PROMPT = `You read a shopping page's text and pick out the single main product for a personal shopping tracker. Ignore navigation, "you may also like" and recently-viewed sections, and promotional banners. Report only what the page states: if you are not sure of the price, return null rather than guessing a number. The numbered image list holds image addresses found on the page; choose the one that shows the main product, or null.`;

export type PageExtraction = {
  itemName: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
};

export async function extractWithClaude(html: string, url: string): Promise<PageExtraction | null> {
  try {
    const images = collectLargeImageCandidates(html, url);
    const heading = [extractTitleTag(html), extractMetaContent(html, "og:title")].filter(Boolean).join(" | ");

    const content = [
      `Page address: ${url}`,
      heading ? `Page title: ${heading}` : "",
      "",
      "Page text:",
      htmlToReadableText(html),
      "",
      images.length > 0
        ? ["Candidate images:", ...images.map((u, i) => `${i + 1}. ${u}`)].join("\n")
        : "Candidate images: none found.",
    ]
      .filter((line, i) => line !== "" || i > 0)
      .join("\n");

    const response = await getAnthropicClient().messages.parse({
      model: URL_EXTRACTION_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(PageSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) return null;

    const itemName = parsed.itemName?.trim() || null;
    if (!itemName && parsed.price === null) return null;

    const index = parsed.imageIndex;
    const imageUrl = index !== null && index >= 1 && index <= images.length ? images[index - 1] : null;

    return {
      itemName,
      price: parsed.price,
      currency: parsed.currency?.trim().toUpperCase() || null,
      imageUrl,
    };
  } catch (error) {
    console.warn("Page text extraction failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
