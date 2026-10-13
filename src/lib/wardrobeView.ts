// Pure logic behind the wardrobe page: categories, filtering, sorting, and the
// geometry of the Rack view. Kept free of React so it can be unit tested, and
// so the rack can work out which items are on screen without measuring the DOM
// (every entry has a fixed width, so each x position is known up front).

export type WardrobeEntry = {
  id: string;
  displayName: string;
  brand: string | null;
  // Raw category as stored, shown on the placeholder card.
  category: string | null;
  // Lower-cased rack/grid category key, "other" when unrecognised.
  categoryKey: string;
  colorLabel: string | null;
  colorFamily: string | null;
  price: number | null;
  ownedSince: string | null;
  sortTime: number;
  imageUrl: string | null;
  needsReview: boolean;
};

export type CategoryConfig = { key: string; label: string; hangs: boolean };

// Rack order. Hanging categories hang from the rail; the rest stand on the shelf.
export const CATEGORIES: readonly CategoryConfig[] = [
  { key: "tops", label: "Tops", hangs: true },
  { key: "knitwear", label: "Knitwear", hangs: true },
  { key: "outerwear", label: "Outerwear", hangs: true },
  { key: "bottoms", label: "Bottoms", hangs: true },
  { key: "dresses", label: "Dresses", hangs: true },
  { key: "shoes", label: "Shoes", hangs: false },
  { key: "bags", label: "Bags", hangs: false },
  { key: "accessories", label: "Accessories", hangs: false },
];

// Anything without a recognised category still has to live somewhere.
export const OTHER_CATEGORY: CategoryConfig = { key: "other", label: "Other", hangs: false };

const BY_KEY = new Map([...CATEGORIES, OTHER_CATEGORY].map((c) => [c.key, c]));

export function categoryKeyOf(category: string | null | undefined): string {
  const key = category?.trim().toLowerCase() ?? "";
  return BY_KEY.has(key) && key !== OTHER_CATEGORY.key ? key : OTHER_CATEGORY.key;
}

export function categoryConfig(key: string): CategoryConfig {
  return BY_KEY.get(key) ?? OTHER_CATEGORY;
}

export type Sort = "newest" | "price";

export function sortEntries<T extends WardrobeEntry>(entries: readonly T[], sort: Sort): T[] {
  return [...entries].sort((a, b) => {
    if (sort === "price") {
      if (a.price === null && b.price === null) return 0;
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    }
    return b.sortTime - a.sortTime;
  });
}

export function matchesQuery(entry: WardrobeEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [entry.displayName, entry.brand, entry.category, entry.colorLabel]
    .filter((part): part is string => Boolean(part))
    .some((part) => part.toLowerCase().includes(needle));
}

// ---------- Rack geometry (px) ----------
// These numbers are mirrored by the CSS custom properties on the rack track
// (see rackLayoutVars), so keep them in one place.
export const RACK = {
  cardW: 160,
  cardH: 200, // 4:5
  gap: 16,
  dividerW: 52,
  pad: 16,
  // Height of the stage the shelf line sits at the bottom of.
  stageH: 340,
  // Room under the shelf line for the tags of items that stand on it.
  tagRowH: 104,
} as const;

export const VIRTUALIZE_AFTER = 60;

export type RackEntry<T> =
  | { kind: "divider"; key: string; x: number; label: string; count: number }
  | { kind: "item"; key: string; x: number; item: T; hangs: boolean; position: number };

export type RackLayout<T> = {
  entries: RackEntry<T>[];
  width: number;
  sections: { key: string; label: string; x: number; count: number }[];
  itemCount: number;
};

// Groups items by category in rack order (items keep their incoming order
// inside a section) and assigns each divider tab and item an x position.
// Empty categories produce no section at all.
export function layoutRack<T extends { id: string; categoryKey: string }>(items: readonly T[]): RackLayout<T> {
  const order = [...CATEGORIES, OTHER_CATEGORY];
  const entries: RackEntry<T>[] = [];
  const sections: RackLayout<T>["sections"] = [];
  let x: number = RACK.pad;
  let position = 0;

  for (const category of order) {
    const inSection = items.filter((item) => item.categoryKey === category.key);
    if (inSection.length === 0) continue;

    sections.push({ key: category.key, label: category.label, x, count: inSection.length });
    entries.push({ kind: "divider", key: `divider-${category.key}`, x, label: category.label, count: inSection.length });
    x += RACK.dividerW + RACK.gap;

    for (const item of inSection) {
      position += 1;
      entries.push({ kind: "item", key: item.id, x, item, hangs: category.hangs, position });
      x += RACK.cardW + RACK.gap;
    }
  }

  return { entries, width: x - RACK.gap + RACK.pad, sections, itemCount: position };
}

// Entries whose box touches [scrollLeft - buffer, scrollLeft + viewWidth + buffer].
export function visibleEntries<T>(
  entries: readonly RackEntry<T>[],
  scrollLeft: number,
  viewWidth: number,
  buffer: number
): RackEntry<T>[] {
  const from = scrollLeft - buffer;
  const to = scrollLeft + viewWidth + buffer;
  return entries.filter((entry) => {
    const width = entry.kind === "divider" ? RACK.dividerW : RACK.cardW;
    return entry.x + width >= from && entry.x <= to;
  });
}
