import type { Prisma } from "@prisma/client";

// A development-only way to look at just the mock wardrobe (or just the real
// one) while designing, without deleting anything. Set DEV_WARDROBE_VIEW in
// .env to "seed", "real" or "all" (the default). "seed" shows only rows tagged
// source "seed"; "real" shows only rows with no source (Gmail-synced or added
// by hand).
//
// In production this does nothing at all, whatever the variable says: every
// function here reports "all" when NODE_ENV is "production", so a stray value
// on a host can never hide anyone's wardrobe.
//
// It is applied where the app lists "your wardrobe" (the Wardrobe page, Home,
// the Lookbook board's drawer and suggestions, outfit suggestions, and the
// pause screen's similar items). It is a view, not an access rule: nothing that
// checks ownership or reads an item by id uses it.

export type DevWardrobeView = "seed" | "real" | "all";

type Env = Record<string, string | undefined>;

export function devWardrobeView(env: Env = process.env): DevWardrobeView {
  if (env.NODE_ENV === "production") return "all";
  const value = env.DEV_WARDROBE_VIEW?.trim().toLowerCase();
  return value === "seed" || value === "real" ? value : "all";
}

// Spread into a wardrobe item's `where`.
export function devWardrobeWhere(env: Env = process.env): Prisma.WardrobeItemWhereInput {
  const view = devWardrobeView(env);
  if (view === "seed") return { source: "seed" };
  if (view === "real") return { source: null };
  return {};
}

// The banner text while a filter is on, or null.
export function devWardrobeBanner(env: Env = process.env): string | null {
  const view = devWardrobeView(env);
  if (view === "seed") return "Showing seed items only";
  if (view === "real") return "Showing real items only";
  return null;
}
