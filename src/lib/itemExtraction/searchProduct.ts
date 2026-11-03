import { matchBrand } from "@/lib/brands/matchBrand";
import { mapWithConcurrency } from "@/lib/concurrency";
import { decodeHtmlEntities } from "@/lib/text";
import { extractFromUrl, type UrlExtraction } from "./urlExtractor";
import { getCached, normalizeQueryKey, setCached } from "./searchCache";

export type SearchCandidate = UrlExtraction & {
  url: string;
  merchant: string;
};

export type SearchResult = {
  candidates: SearchCandidate[];
  // The brand matchBrand() detected in the query, if any - the UI can use
  // this to show "searching zara.com" style feedback. Null means the
  // search ran unrestricted (unlisted brand, or no brand named at all).
  scopedToBrand: string | null;
};

type BraveWebResult = { title: string; url: string; description?: string };

async function braveWebSearch(query: string, count: number): Promise<BraveWebResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY is not set");
  }

  const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
    q: query,
    count: String(count),
  })}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
  });

  if (!response.ok) {
    throw new Error(`Brave Search API request failed (${response.status})`);
  }

  const body = (await response.json()) as { web?: { results?: BraveWebResult[] } };
  return body.web?.results ?? [];
}

function merchantFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const SIGNIFICANT_WORD_MIN_LENGTH = 4;

function significantWords(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\W+/).filter((word) => word.length >= SIGNIFICANT_WORD_MIN_LENGTH));
}

// True when the page we actually fetched doesn't look like the page Brave's
// crawler saw at this URL - a strong signal our fetch got redirected to a
// bot-check/cookie-consent/generic-homepage shell instead of the real page
// (confirmed happening in practice: some retailers return 200 with a
// homepage title for every URL to a server-side fetch with no cookies/JS).
// A false positive here just means an extra SERP-title fallback candidate
// where a real one would have worked - low cost, since both paths still
// produce a usable (if lower-confidence) candidate.
function looksLikeWrongPage(extractedName: string, serpTitle: string): boolean {
  const extractedWords = significantWords(extractedName);
  const serpWords = significantWords(serpTitle);
  if (extractedWords.size === 0 || serpWords.size === 0) return false;
  return ![...extractedWords].some((word) => serpWords.has(word));
}

// Brave's title usually ends in " | Retailer Name" or similar - strip a
// trailing pipe-delimited segment, but never split on a hyphen/en-dash,
// since a real product title legitimately uses one (e.g. "Wool Coat - Black").
function cleanSerpTitle(title: string): string {
  return decodeHtmlEntities(title.split("|")[0].trim());
}

const STEMMABLE_MIN_LENGTH = 5;

function stem(word: string): string {
  return word.length >= STEMMABLE_MIN_LENGTH && word.endsWith("s") ? word.slice(0, -1) : word;
}

function significantStems(text: string): Set<string> {
  return new Set([...significantWords(text)].map(stem));
}

// Title patterns that are themselves enough to call a result a
// category/listing page, independent of query overlap.
const CATEGORY_TITLE_PATTERNS: RegExp[] = [/^shop\b/i, /\bfor\s+(women|men|kids?|girls?|boys?)\b/i];
const GENDER_OR_SIZE_PREFIX = /^(women'?s?|men'?s?|kids?|girls?|boys?|plus)\b\s*/i;

// A listing page almost always ends its title on the plain plural of a
// clothing-category noun ("... Blouses", "... Coats", "... Sneakers") -
// distinct from an item title, which is normally singular even when it
// mentions a category word mid-title ("Wilfred THE ONLY COAT"). Checked
// only as a tie-breaker for an otherwise-borderline title (extraStems <= 1)
// - "SHORT SLEEVE KNIT JUMPER..." isn't caught by this, it has plenty of
// its own distinguishing words regardless.
const CLOTHING_CATEGORY_NOUN_STEMS = new Set([
  "blouse", "coat", "short", "dress", "shirt", "sweater", "jacket", "top",
  "shoe", "jean", "skirt", "legging", "cardigan", "hoodie", "sock", "boot",
  "sandal", "bag", "scarf", "pant", "sneaker", "glove", "vest", "romper",
  "jumpsuit", "tee", "tank", "cami", "blazer",
]);

function endsInPluralCategoryNoun(title: string): boolean {
  const words = title.trim().split(/\s+/);
  const last = words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, "");
  if (!last || last.length < STEMMABLE_MIN_LENGTH || !last.endsWith("s")) return false;
  return CLOTHING_CATEGORY_NOUN_STEMS.has(stem(last));
}

// A category/listing page's title is typically just the query's own generic
// terms and nothing else ("Cargo Pants" for a "cargo pants" search, "Shop
// Cargo Pants", "Women's Wool Coats" for a "wool coat" search once the
// gender prefix is stripped) - a real product title almost always adds
// distinguishing words the query didn't ask for ("REGULAR FIT WOOL COAT -
// Black", "Wilfred THE ONLY COAT"). Comparing stems (not exact words) so
// "coats"/"coat" and "pants"/"pant" don't count as distinguishing on their
// own. A single extra stem that's a synonym of the query's own category
// noun ("Batwing Sleeve Blouses" for a "... t shirt" search - "blouse"
// isn't literally "shirt", but the title is still bare-category, just
// ending on a plural category noun) is caught by endsInPluralCategoryNoun.
// This is a heuristic, not a certainty - see hasProductSignal, which only
// applies it when there's no stronger signal (a real schema.org Product or
// a real price) to trust instead.
function looksLikeCategoryPage(title: string, queryWords: Set<string>): boolean {
  if (CATEGORY_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return true;

  const withoutPrefix = title.replace(GENDER_OR_SIZE_PREFIX, "");
  const titleStems = significantStems(withoutPrefix);
  const queryStems = new Set([...queryWords].map(stem));
  const extraStems = [...titleStems].filter((word) => !queryStems.has(word));

  if (extraStems.length === 0) return true;
  if (extraStems.length === 1 && endsInPluralCategoryNoun(withoutPrefix)) return true;
  return false;
}

// The gate the user asked for: a candidate needs at least one real product
// signal - a confirmed schema.org Product node, a real price, or (failing
// both) a title that doesn't itself read as a category/listing page. A
// result with none of these is excluded outright rather than shown as a
// guess; if nothing in a search survives this gate, the caller ends up with
// zero candidates, which the UI already renders as the manual-entry state.
function hasProductSignal(
  itemName: string,
  price: number | null,
  hasStructuredProduct: boolean,
  queryWords: Set<string>
): boolean {
  if (hasStructuredProduct) return true;
  if (price !== null) return true;
  return !looksLikeCategoryPage(itemName, queryWords);
}

// Brave's own ranking doesn't know this app only wants product-detail
// pages - a brand's category/collection/homepage often outranks the
// specific item, especially once a site:<domain> scope narrows everything
// to one retailer. Re-sorting by query-word overlap in the title pushes a
// specific match ("REGULAR FIT WOOL COAT - Black") ahead of a generic one
// ("Women's Wool Coats") before the CANDIDATE_TARGET cutoff is applied -
// this matters most exactly when every result ends up as a low-confidence
// SERP-title fallback (bot-blocked retailers), since then the title is
// literally the only signal a candidate has.
function relevanceScore(title: string, queryWords: Set<string>): number {
  const titleWords = significantWords(title);
  let score = 0;
  for (const word of queryWords) {
    if (titleWords.has(word)) score += 1;
  }
  return score;
}

const CANDIDATE_TARGET = 5;
// Fetched extra beyond CANDIDATE_TARGET since some search results won't
// yield an extractable product page (a category/listing page, a 404, a
// page the extractor can't parse) - overfetching keeps the candidate count
// close to the target without a second round-trip.
const SEARCH_RESULT_COUNT = 8;
const EXTRACTION_CONCURRENCY = 4;

// When a pasted URL can't be scraped directly (fetch and the Playwright
// fallback both failed), the URL's own slug is often still a usable search
// query - e.g. https://zara.com/us/en/wool-coat-p12345.html has "wool coat"
// sitting right there in the path. Picks the longest path segment (product
// slugs are typically longer/more specific than locale or category
// segments like "us"/"en"/"women"), strips the file extension, long numeric
// ids, and separator characters. Returns null when nothing usable remains.
export function deriveQueryFromUrlSlug(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const candidate = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/\.\w+$/, ""))
    .filter((segment) => segment.length > 3)
    .sort((a, b) => b.length - a.length)[0];

  if (!candidate) return null;

  const words = candidate
    .replace(/[-_]+/g, " ")
    .split(" ")
    // Drop product-id-shaped tokens: mostly-numeric, with at most a short
    // letter prefix - "p12345", "12345", "sku00982" - which a plain \b\d+\b
    // regex misses, since there's no word boundary between a letter and an
    // adjoining digit ("p12345" is one contiguous \w run).
    .filter((word) => !/^[a-z]{0,3}\d{3,}$/i.test(word))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return words.length >= 3 ? words : null;
}

// Searches for a product, scoping to a detected brand's domain when one is
// found in the query (accelerates the common case - never a hard
// dependency: an unmatched/unlisted brand just searches unrestricted). Each
// candidate result is run through the exact same extraction pipeline URL
// paste uses, so a search-sourced item and a pasted-URL item produce
// identical shapes into the same confirm step.
export async function searchForItem(query: string): Promise<SearchResult> {
  const cacheKey = normalizeQueryKey(query);
  const cached = getCached<SearchResult>(cacheKey);
  if (cached) return cached;

  const brand = matchBrand(query);
  let webResults = await braveWebSearch(
    brand ? `site:${brand.domain} ${query}` : query,
    SEARCH_RESULT_COUNT
  );

  // A brand-scoped search that finds nothing retries unrestricted rather
  // than surfacing zero results - the domain guess not matching how a site
  // is actually indexed must never be a dead end.
  if (brand && webResults.length === 0) {
    webResults = await braveWebSearch(query, SEARCH_RESULT_COUNT);
  }

  const queryWords = significantWords(query);
  const rankedResults = [...webResults].sort(
    (a, b) => relevanceScore(b.title, queryWords) - relevanceScore(a.title, queryWords)
  );

  const extracted = await mapWithConcurrency(rankedResults, EXTRACTION_CONCURRENCY, async (result) => {
    const extraction = await extractFromUrl(result.url, { aiFallback: false }).catch(() => null);
    const extractionUsable = extraction !== null && !looksLikeWrongPage(extraction.itemName, result.title);

    // Direct fetch failed outright (bot-blocked retailer, common for
    // Aritzia/Zara-style anti-bot), or "succeeded" but clearly returned the
    // wrong page (Shein-style: 200 OK, but the same generic homepage shell
    // for every URL). Brave's own crawled title for this exact URL is the
    // fallback name in that case - it isn't blocked the way our own fetch is.
    const itemName = extractionUsable ? extraction!.itemName : cleanSerpTitle(result.title);
    if (!itemName) return null;

    const price = extractionUsable ? extraction!.price : null;
    const hasStructuredProduct = extractionUsable && extraction!.confidence?.itemName === "high";

    if (!hasProductSignal(itemName, price, hasStructuredProduct, queryWords)) {
      return null;
    }

    if (extractionUsable) {
      const candidate: SearchCandidate = { ...extraction!, url: result.url, merchant: merchantFromUrl(result.url) };
      return candidate;
    }

    const candidate: SearchCandidate = {
      itemName,
      price: null,
      imageUrl: null,
      category: null,
      colorName: null,
      colorFamily: null,
      styleTags: [],
      confidence: { itemName: "low" },
      url: result.url,
      merchant: merchantFromUrl(result.url),
    };
    return candidate;
  });

  const candidates = extracted.filter((c): c is SearchCandidate => c !== null).slice(0, CANDIDATE_TARGET);

  const searchResult: SearchResult = { candidates, scopedToBrand: brand?.name ?? null };
  setCached(cacheKey, searchResult);
  return searchResult;
}
