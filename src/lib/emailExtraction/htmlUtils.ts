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

// Heuristic src patterns for tracking pixels / spacers / brand logos - not
// useful as a "product image" even though they're technically <img> tags.
const NON_PRODUCT_IMAGE_PATTERNS = [
  /track/i,
  /pixel/i,
  /beacon/i,
  /spacer/i,
  /1x1/i,
  /open\.(gif|png)/i,
  /logo/i,
];

// Pulls the first plausible product image URL directly out of the raw HTML
// - no vision call needed for this field, per the design.
export function extractProductImageUrl(html: string): string | undefined {
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);

  for (const match of matches) {
    const src = match[1];
    if (!src.startsWith("http")) continue;
    if (NON_PRODUCT_IMAGE_PATTERNS.some((pattern) => pattern.test(src))) continue;
    return src;
  }

  return undefined;
}
