import type { ColorFamily } from "@/lib/colorFamily";

// Representative swatch hex per color family - used for the wardrobe grid's
// color dot (src/app/wardrobe/ColorDot.tsx) and the seed-only garment
// silhouette fill (src/app/wardrobe/GarmentSilhouette.tsx). Picked as a
// mid-tone that reads clearly against the card's white background.
export const COLOR_SWATCH_HEX: Record<Exclude<ColorFamily, "multi">, string> = {
  black: "#1f1a1a",
  navy: "#22304f",
  grey: "#8b8683",
  cream: "#e8ddc7",
  brown: "#6b4a34",
  red: "#a3312f",
  pink: "#d98fa0",
  green: "#4f6b52",
  blue: "#3f6a92",
  purple: "#6a5089",
  yellow: "#d9b64a",
  orange: "#c17a3a",
  white: "#f5f3f0",
  metallic: "#b3a695",
};

// "multi" has no single representative hue - rendered as a diagonal
// two-tone split everywhere a swatch is needed, so the dot and the
// silhouette fill read the same way for a two-tone/patterned item.
export const MULTI_SWATCH = { a: "#c9a76b", b: "#3f3b3a" };

// Fills light enough to need a dark (not light) detail stroke when used as
// a garment silhouette's fill color - see GarmentSilhouette.tsx.
const LIGHT_FAMILIES = new Set<string>(["white", "cream", "yellow", "pink", "orange"]);

export type Swatch = { kind: "solid"; hex: string } | { kind: "multi"; a: string; b: string };

export function swatchFor(colorFamily: string | null | undefined): Swatch | null {
  if (!colorFamily) return null;
  if (colorFamily === "multi") return { kind: "multi", a: MULTI_SWATCH.a, b: MULTI_SWATCH.b };
  const hex = (COLOR_SWATCH_HEX as Record<string, string>)[colorFamily];
  return hex ? { kind: "solid", hex } : null;
}

export function isLightSwatch(colorFamily: string | null | undefined): boolean {
  if (!colorFamily) return false;
  return colorFamily === "multi" ? true : LIGHT_FAMILIES.has(colorFamily);
}
