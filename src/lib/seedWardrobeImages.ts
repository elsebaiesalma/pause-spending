// One real Unsplash garment photo per category for the mock wardrobe seed
// (rows with source: "seed" only). Each was checked by eye: the garment alone,
// no people and no visible brand logos. 4:5 crops to match the wardrobe cards.
// Unsplash License: free to use, no attribution required.

const BASE = "https://images.unsplash.com/photo-";
const CROP = "?auto=format&fit=crop&w=800&h=1000&q=75";

const PHOTO_IDS: Record<string, string> = {
  tops: "1651761179569-4ba2aa054997", // plain white tee, flat
  knitwear: "1631541909061-71e349d1f203", // chunky knit sweater on a hook
  outerwear: "1543076447-215ad9ba6923", // denim jacket with a shearling collar
  bottoms: "1714143164072-7646ef5cb24d", // dark blue jeans, flat
  shoes: "1534233812932-59b8fa1b780c", // black leather chelsea boots
  bags: "1624687943971-e86af76d57de", // tan leather tote
};

export function seedImageUrlFor(category: string | null | undefined): string | null {
  const id = PHOTO_IDS[category?.toLowerCase() ?? ""];
  return id ? `${BASE}${id}${CROP}` : null;
}
