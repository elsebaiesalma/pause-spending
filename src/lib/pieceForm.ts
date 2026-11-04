import { isColorFamily, type ColorFamily } from "@/lib/colorFamily";
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
