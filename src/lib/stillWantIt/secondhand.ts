import resaleSites from "./resaleSites.json";

// Resale sites to search, from ./resaleSites.json. To add one, append an
// entry with a `{query}` placeholder in its searchUrl. Links are search
// pages only: nothing is scraped, and no listing or price is shown.
export type ResaleSite = { name: string; searchUrl: string };

export type ResaleSearchLink = { name: string; url: string };

export function buildResaleSearchLinks(
  brand: string | null,
  itemName: string | null,
  sites: readonly ResaleSite[] = resaleSites
): ResaleSearchLink[] {
  const query = [brand, itemName].filter((part) => part && part.trim()).join(" ").trim();
  if (!query) return [];

  const encoded = encodeURIComponent(query);
  return sites.map((site) => ({ name: site.name, url: site.searchUrl.replace("{query}", encoded) }));
}
