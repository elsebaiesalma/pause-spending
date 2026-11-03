// Raised from 15,000: real multi-item order confirmations (e.g. a 4-item
// REVOLVE order) were hitting the old cap before the subtotal/total section
// at the bottom of the email, which extractPurchaseItems' reconciliation
// check needs to see. Still bounded so a single huge email can't blow up
// token usage.
const MAX_CLEANED_HTML_LENGTH = 40000;

// Tags whose boundaries mark a genuine row/cell/block break in a receipt's
// layout - inserting a newline at each one (before collapsing whitespace)
// keeps an item's name, quantity, and price on lines close enough together
// that an LLM reading the cleaned text can tell they belong to the same
// row, instead of everything from every cell in the email being collapsed
// into one undifferentiated line.
const BLOCK_BOUNDARY_TAGS = ["tr", "\\/tr", "td", "\\/td", "table", "\\/table", "div", "\\/div", "p", "\\/p", "li", "\\/li", "br"];
const BLOCK_BOUNDARY_PATTERN = new RegExp(`<(${BLOCK_BOUNDARY_TAGS.join("|")})\\b`, "gi");

// Strips style/script blocks, then breaks the HTML into one line per
// row/cell/block before collapsing whitespace - so table/row structure
// (item, qty, price staying together) survives being flattened into text,
// rather than every cell in a multi-column layout running into one line.
export function cleanHtmlForExtraction(html: string): string {
  const withoutStyleAndScript = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const collapsedSpaces = withoutStyleAndScript.replace(/\s+/g, " ");
  const withRowBreaks = collapsedSpaces.replace(BLOCK_BOUNDARY_PATTERN, "\n<$1");
  const collapsed = withRowBreaks
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
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

// Alt-text signals a filename alone can't catch: a genuine product photo's
// alt text describes the item, not the app/platform chrome around it.
const NON_PRODUCT_ALT_PATTERNS = [
  /logo/i,
  /\b(facebook|instagram|tiktok|twitter|pinterest|youtube|snapchat|linkedin|whatsapp)\b/i,
  /app store/i,
  /google play/i,
  /play store/i,
  // Bare department/nav labels (real example: H&M's "Women"/"Men"/"Kids"
  // shop-by-department banners, reused across every order email) - a real
  // product photo's alt text is never just a one-word department name.
  /^(women|men|kids|shop now|new arrivals|sale|view in browser)$/i,
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

// A real product photo is never this small - this is always a spacer, a
// divider line, or a 1x1 tracking pixel, regardless of what its filename
// says. Catches cases like a literal <img ... height="1"> that no filename
// pattern would flag (e.g. a file plainly named "trans.gif").
const TINY_IMAGE_MAX_DIMENSION = 8;

function parseDimension(tag: string, attr: "width" | "height"): number | null {
  const match = tag.match(new RegExp(`${attr}=["']?(\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

function parseAlt(tag: string): string | null {
  const match = tag.match(/alt=["']([^"']*)["']/i);
  return match ? match[1] : null;
}

function isTinyImage(tag: string): boolean {
  const width = parseDimension(tag, "width");
  const height = parseDimension(tag, "height");
  return (
    (width !== null && width <= TINY_IMAGE_MAX_DIMENSION) ||
    (height !== null && height <= TINY_IMAGE_MAX_DIMENSION)
  );
}

export function isPlausibleProductImage(src: string, imgTag: string): boolean {
  if (!src.startsWith("http")) return false;
  if (NON_PRODUCT_IMAGE_PATTERNS.some((pattern) => pattern.test(src))) return false;
  if (isTinyImage(imgTag)) return false;
  const alt = parseAlt(imgTag);
  if (alt && NON_PRODUCT_ALT_PATTERNS.some((pattern) => pattern.test(alt))) return false;
  return true;
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
// Each candidate is vetted against its src, its own alt text, and its
// width/height attributes (not filename patterns alone) before being
// offered up - a plain 1x1 spacer or a department-nav banner rarely has a
// telltale filename, but its dimensions or alt text usually give it away.
// A separate, DB-driven check (isReusedBrandingImage, applied by the
// caller once the merchant is known) catches shared template assets that
// pass every per-email heuristic here but turn out to repeat across many
// of this merchant's other emails.
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

    const imgMatch = inner.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (!imgMatch) continue;
    const src = imgMatch[1];
    if (!isPlausibleProductImage(src, imgMatch[0]) || seen.has(src)) continue;

    seen.add(src);
    candidates.push({ imageUrl: src, productLink: href });
  }

  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgMatches) {
    if (candidates.length >= MAX_IMAGE_CANDIDATES) break;
    const src = match[1];
    if (!isPlausibleProductImage(src, match[0]) || seen.has(src)) continue;

    seen.add(src);
    candidates.push({ imageUrl: src });
  }

  return candidates;
}
