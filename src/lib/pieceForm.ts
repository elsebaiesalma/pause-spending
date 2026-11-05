import { COLOR_FAMILIES, isColorFamily, type ColorFamily } from "@/lib/colorFamily";
import { CATEGORIES } from "@/lib/wardrobeView";

// Small, pure rules for the Add a piece / Edit piece form, kept apart from the
// component so they can be tested without a browser.

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 30;
export const MAX_NAME_LENGTH = 120;

// A tag is one short lower-case phrase. Commas are the separator the API
// splits on, so one can never live inside a tag.
export function normalizeTag(raw: string): string {
  return raw.replace(/,/g, " ").replace(/\s+/g, " ").trim().toLowerCase().slice(0, MAX_TAG_LENGTH).trim();
}

export function addTag(tags: readonly string[], raw: string): string[] {
  const tag = normalizeTag(raw);
  if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return [...tags];
  return [...tags, tag];
}

export function removeTag(tags: readonly string[], tag: string): string[] {
  return tags.filter((existing) => existing !== tag);
}

export function validateName(value: string): string | null {
  return value.trim() ? null : "Add a name for this piece.";
}

// Both are yyyy-mm-dd, which sorts the same as the dates they stand for.
export function validateOwnedSince(value: string, today: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Use a date like 2026-03-14.";
  return value > today ? "Pick today or an earlier date." : null;
}

export function todayISO(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export const MAX_BRAND_LENGTH = 60;
const MAX_PRICE = 100000;

// "49", "49.9" and "$49.99" are fine; blank means no price. Anything else is
// an error to show next to the field, never a guessed number.
export function parsePrice(raw: string): { ok: true; value: number | null } | { ok: false } {
  const text = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!text) return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false };
  const value = Number(text);
  return value > MAX_PRICE ? { ok: false } : { ok: true, value };
}

export function validatePrice(raw: string): string | null {
  return parsePrice(raw).ok ? null : "Enter a price like 49.99.";
}

export type TagSuggestion = {
  category: string | null;
  colorFamily: ColorFamily | null;
  colorName: string | null;
  styleTags: string[];
  useCaseTags: string[];
};

// The model's answer, cleaned up to what the form can show: a category only if
// it is one of the closet's own, tags normalised, de-duplicated and capped.
export function toSuggestion(raw: {
  category: string;
  colorName: string | null;
  colorFamily: string | null;
  styleTags: string[];
  useCaseTags: string[];
}): TagSuggestion {
  const category = raw.category.trim().toLowerCase();
  const clean = (tags: string[], limit: number) =>
    tags.reduce<string[]>((all, tag) => (all.length >= limit ? all : addTag(all, tag)), []);
  return {
    category: CATEGORIES.some((c) => c.key === category) ? category : null,
    colorFamily: raw.colorFamily && isColorFamily(raw.colorFamily) ? raw.colorFamily : null,
    colorName: raw.colorName?.trim() || null,
    styleTags: clean(raw.styleTags, 4),
    useCaseTags: clean(raw.useCaseTags, 3),
  };
}

const DEFAULT_COMMON: readonly ColorFamily[] = ["black", "white", "brown"];

// The families the colour picker shows first: the ones this closet has most of
// (ties in the picker's own order), topped up with common basics for a closet
// with fewer than three colours.
export function commonColors(families: readonly (string | null)[], count = 3): ColorFamily[] {
  const tally = new Map<ColorFamily, number>();
  for (const family of families) {
    if (family && isColorFamily(family)) tally.set(family, (tally.get(family) ?? 0) + 1);
  }
  const ranked = [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || COLOR_FAMILIES.indexOf(a[0]) - COLOR_FAMILIES.indexOf(b[0]))
    .map(([family]) => family);
  for (const basic of DEFAULT_COMMON) if (!ranked.includes(basic)) ranked.push(basic);
  return ranked.slice(0, count);
}
