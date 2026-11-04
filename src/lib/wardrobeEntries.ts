import { capitalizeFirst, stripBrandPrefix } from "@/lib/wardrobeDisplay";
import { CATEGORIES, categoryKeyOf, type WardrobeEntry } from "@/lib/wardrobeView";

// ownedSince is a date-only column stored at UTC midnight, so it must be
// formatted in UTC or it shows the previous month west of Greenwich.
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export type WardrobeRow = {
  id: string;
  itemName: string;
  category: string | null;
  colorName: string | null;
  colorFamily: string | null;
  imageUrl: string | null;
  ownedSince: Date | null;
  status: string;
  // Typed by hand on pieces with no purchase.
  brand?: string | null;
  price?: unknown;
  sourcePurchase: { merchant: string; price: unknown } | null;
};

// Shared by the Wardrobe page and the Home rack slice, so both show the same
// brand-stripped name, capitalized color and price.
export function toWardrobeEntry(item: WardrobeRow): WardrobeEntry {
  // A receipt piece shows its purchase's merchant and price; a hand-added one
  // shows what was typed.
  const brand = item.sourcePurchase?.merchant ?? item.brand ?? null;
  const rawPrice = item.sourcePurchase?.price ?? item.price ?? null;
  const colorName = item.colorName ?? item.colorFamily;
  return {
    id: item.id,
    displayName: stripBrandPrefix(item.itemName, brand),
    brand,
    category: item.category,
    categoryKey: categoryKeyOf(item.category),
    colorLabel: colorName ? capitalizeFirst(colorName) : null,
    colorFamily: item.colorFamily,
    price: rawPrice != null ? Number(rawPrice) : null,
    ownedSince: item.ownedSince ? MONTH_YEAR_FORMAT.format(item.ownedSince) : null,
    sortTime: item.ownedSince?.getTime() ?? 0,
    // Seeded rows carry mock photos too; a row with no image gets the
    // designed placeholder card in both views.
    imageUrl: item.imageUrl || null,
    needsReview: item.status === "needs_review",
  };
}

const HANGING_KEYS = new Set(CATEGORIES.filter((c) => c.hangs).map((c) => c.key));

// The newest few pieces from categories that hang on the rack (never shoes,
// bags or accessories). Wardrobe items have no created-at, so "newest" is
// newest owned-since date, undated pieces last.
export function recentHangingEntries(entries: readonly WardrobeEntry[], limit: number): WardrobeEntry[] {
  return entries
    .filter((entry) => HANGING_KEYS.has(entry.categoryKey))
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, limit);
}
