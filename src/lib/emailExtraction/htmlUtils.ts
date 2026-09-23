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

export type ImageCandidate = {
  imageUrl: string;
  productLink?: string;
};

const MAX_IMAGE_CANDIDATES = 8;

// Collects every plausible product-image candidate in the email, instead
// of committing to a single "best guess" purely from regex heuristics.
// A multi-item order has one photo per item, and no amount of URL-pattern
// guessing can know which photo goes with which item name - that pairing
// needs the LLM reading the surrounding text, which is why this returns a
// candidate list for the LLM to choose from (per item) rather than trying
// to pick a single winner itself.
//
// Anchor-wrapped images that link to an actual product page are collected
// first (highest-confidence: the link target confirms it's a specific
// product, not chrome), then any remaining bare/unlinked plausible images,
// deduplicated by URL and capped so the prompt doesn't bloat on emails
// with dozens of incidental images.
export function extractImageCandidates(html: string): ImageCandidate[] {
  const seen = new Set<string>();
  const candidates: ImageCandidate[] = [];

  const anchorMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*?)<\/a>/gi);
  for (const anchor of anchorMatches) {
    if (candidates.length >= MAX_IMAGE_CANDIDATES) break;
    const href = anchor[1];
    const inner = anchor[2];
    if (!href.startsWith("http")) continue;
    if (NON_PRODUCT_LINK_PATTERNS.some((pattern) => pattern.test(href))) continue;
    if (!PRODUCT_LINK_PATTERNS.some((pattern) => pattern.test(href))) continue;

    const imgMatch = inner.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (!imgMatch) continue;
    const src = imgMatch[1];
    if (!isPlausibleProductImageSrc(src) || seen.has(src)) continue;

    seen.add(src);
    candidates.push({ imageUrl: src, productLink: href });
  }

  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgMatches) {
    if (candidates.length >= MAX_IMAGE_CANDIDATES) break;
    const src = match[1];
    if (!isPlausibleProductImageSrc(src) || seen.has(src)) continue;

    seen.add(src);
    candidates.push({ imageUrl: src });
  }

  return candidates;
}
