import brandListRaw from "./brandList.json";

export type Brand = {
  name: string;
  domain: string;
  aliases: string[];
};

export const BRAND_LIST: Brand[] = brandListRaw as Brand[];

// Every searchable name/alias for a brand, normalized once at module load -
// lowercase, trimmed, with the "&"/"and" and possessive-apostrophe variants
// a user is likely to type folded into the same set, so "levis" and "levi's"
// both hit the same brand without either being listed as a separate alias.
type IndexedBrand = { brand: Brand; terms: string[] };

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .trim();
}

const INDEX: IndexedBrand[] = BRAND_LIST.map((brand) => {
  const terms = new Set<string>();
  terms.add(normalizeTerm(brand.name));
  for (const alias of brand.aliases) {
    terms.add(normalizeTerm(alias));
  }
  return { brand, terms: Array.from(terms) };
});

// Instant, local, zero-API-cost brand detection: true only when a listed
// brand name/alias appears as a whole word (or word sequence) in the query,
// never a bare substring match - "gap" must not match inside "gaps in my
// wardrobe", but "the gap jacket" does match "gap". An unmatched/unlisted
// brand simply returns null; callers then search unrestricted rather than
// failing - the list accelerates the common case, it is never a
// precondition for search to work at all.
export function matchBrand(query: string): Brand | null {
  const normalizedQuery = normalizeTerm(query);
  if (!normalizedQuery) return null;

  let best: { brand: Brand; termLength: number } | null = null;

  for (const { brand, terms } of INDEX) {
    for (const term of terms) {
      if (!term) continue;
      const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(term)}(?:\\s|$)`);
      if (pattern.test(normalizedQuery)) {
        // Prefer the longest matching term so "j.crew" beats a shorter
        // coincidental match, and a query naming two brands picks the more
        // specific (longer) one deterministically rather than by list order.
        if (!best || term.length > best.termLength) {
          best = { brand, termLength: term.length };
        }
      }
    }
  }

  return best?.brand ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
