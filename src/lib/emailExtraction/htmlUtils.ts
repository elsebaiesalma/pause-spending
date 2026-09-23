const MAX_CLEANED_HTML_LENGTH = 15000;

// Strips style/script blocks and collapses whitespace before handing HTML
// to the LLM - keeps token usage down and removes noise that isn't useful
// for extraction (retailer emails are often bloated with CSS/tracking).
export function cleanHtmlForExtraction(html: string): string {
  const withoutStyleAndScript = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const collapsed = withoutStyleAndScript.replace(/\s+/g, " ").trim();
  return collapsed.slice(0, MAX_CLEANED_HTML_LENGTH);
}

// Heuristic src patterns for tracking pixels, spacers, and brand chrome
// (logos, header/nav banners, social icons) - not useful as a "product
// image" even though they're technically <img> tags. Retailer templates
// commonly reuse one shared banner image (e.g. "Remail_2025Rebrand_
// Header.png") across every email, with no "logo" in the filename at all,
// so this list has to cover more than just the word "logo".
const NON_PRODUCT_IMAGE_PATTERNS = [
  /track/i,
  /pixel/i,
  /beacon/i,
  /spacer/i,
  /1x1/i,
  /open\.(gif|png)/i,
  /logo/i,
  /header/i,
  /banner/i,
  /masthead/i,
  /\bnav(bar)?\b/i,
  /rebrand/i,
  /\bbrand\b/i,
  /social/i,
  /\bicon\b/i,
  /badge/i,
];

// Path segments that mark a link as pointing at a specific product page,
// as opposed to navigation chrome (home, account, unsubscribe, etc.).
const PRODUCT_LINK_PATTERNS = [/\/products?\//i, /\/p\/[\w-]/i, /\/item[s]?\//i, /\/dp\//i];

const NON_PRODUCT_LINK_PATTERNS = [
  /unsubscribe/i,
  /privacy/i,
  /\bterms\b/i,
  /\baccount\b/i,
  /\bcart\b/i,
  /checkout/i,
  /preferences/i,
  /\bhelp\b/i,
  /support/i,
];

function isPlausibleProductImageSrc(src: string): boolean {
  return src.startsWith("http") && !NON_PRODUCT_IMAGE_PATTERNS.some((pattern) => pattern.test(src));
}

// Pulls the product image and, when findable, the product page link
// directly out of the raw HTML - no vision call needed for either field,
// per the design. Most retailer templates wrap the product photo in an
// <a href=".../products/..."> pointing at that exact product, so that pairing
// is tried first since it gives a high-confidence match for both fields
// at once; a bare <img> (no product-link anchor) is the fallback for
// templates that don't link the photo.
export function extractProductImageAndLink(html: string): {
  imageUrl: string | undefined;
  productLink: string | undefined;
} {
  const anchorMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*?)<\/a>/gi);

  for (const anchor of anchorMatches) {
    const href = anchor[1];
    const inner = anchor[2];
    if (!href.startsWith("http")) continue;
    if (NON_PRODUCT_LINK_PATTERNS.some((pattern) => pattern.test(href))) continue;

    const imgMatch = inner.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (!imgMatch) continue;
    const src = imgMatch[1];
    if (!isPlausibleProductImageSrc(src)) continue;

    // A product-shaped URL is a strong signal this specific anchor+image
    // pair is the item, not just "the first image that happens to sit
    // inside some link" (e.g. a "view in browser" wrapper).
    if (PRODUCT_LINK_PATTERNS.some((pattern) => pattern.test(href))) {
      return { imageUrl: src, productLink: href };
    }
  }

  return { imageUrl: extractProductImageUrl(html), productLink: undefined };
}

// Pulls the first plausible product image URL directly out of the raw HTML
// - no vision call needed for this field, per the design. Used as the
// fallback when no anchor-wrapped product image/link pairing is found.
export function extractProductImageUrl(html: string): string | undefined {
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);

  for (const match of matches) {
    const src = match[1];
    if (isPlausibleProductImageSrc(src)) return src;
  }

  return undefined;
}
