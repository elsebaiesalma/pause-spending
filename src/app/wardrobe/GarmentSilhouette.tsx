import { swatchFor, isLightSwatch } from "@/lib/colorSwatch";

export type SilhouetteShape = "tee" | "knit" | "trousers" | "jeans" | "coat" | "boot" | "sneaker" | "bag";

// Maps a seeded item's category + name to one of the 8 fixed silhouette
// shapes below. Only ever called for source: "seed" rows (see page.tsx) -
// real, sync-derived items keep their own real photo.
export function silhouetteForItem(category: string | null, itemName: string): SilhouetteShape | null {
  const cat = category?.toLowerCase() ?? "";
  const name = itemName.toLowerCase();

  if (cat === "knitwear") return "knit";
  if (cat === "bags") return "bag";
  if (cat === "outerwear") return "coat";
  if (cat === "shoes") return name.includes("boot") ? "boot" : "sneaker";
  if (cat === "bottoms") return name.includes("jean") ? "jeans" : "trousers";
  if (cat === "tops") return "tee";
  return null;
}

const OUTLINES: Record<SilhouetteShape, string> = {
  tee: "M50,26 L38,32 L24,40 L30,54 L40,48 L40,98 L60,98 L60,48 L70,54 L80,40 L66,32 Z",
  knit: "M50,28 L36,34 L20,44 L27,58 L38,50 L38,100 L62,100 L62,50 L73,58 L80,44 L64,34 Z",
  trousers: "M34,24 L66,24 L66,34 L58,34 L58,98 L46,98 L46,40 L54,40 L54,34 L34,34 Z M46,34 L34,34 L34,24",
  jeans: "M34,24 L66,24 L66,34 L58,34 L54,98 L44,98 L42,40 L58,40 L58,34 L34,34 Z",
  coat: "M50,18 L36,26 L18,40 L26,54 L38,46 L38,110 L62,110 L62,46 L74,54 L82,40 L64,26 Z",
  boot: "M40,26 L60,26 L60,76 L80,76 L80,94 L32,94 L32,80 L40,80 Z",
  sneaker: "M18,86 L24,70 L45,60 L70,64 L83,78 L83,92 L16,92 Z",
  bag: "M30,54 L70,54 L76,100 L24,100 Z",
};

// A couple of light detail strokes per shape so the placeholder reads as a
// deliberate garment icon rather than a blank blob - never enough detail to
// look like a literal product photo.
const DETAILS: Record<SilhouetteShape, string[]> = {
  tee: ["M42,32 Q50,40 58,32"],
  knit: ["M42,32 Q50,42 58,32", "M40,58 L60,58", "M40,92 L60,92"],
  trousers: ["M50,40 L50,98"],
  jeans: ["M50,40 L48,98", "M40,46 Q44,50 40,56", "M60,46 Q56,50 60,56"],
  coat: ["M44,26 L50,42 L56,26", "M50,50 L50,104", "M50,64 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0", "M50,82 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0"],
  boot: ["M32,80 L80,80"],
  sneaker: ["M22,88 L79,88", "M30,74 Q45,66 62,68"],
  bag: ["M40,54 Q50,32 60,54"],
};

export function GarmentSilhouette({
  shape,
  colorFamily,
}: {
  shape: SilhouetteShape;
  colorFamily: string | null;
}) {
  const swatch = swatchFor(colorFamily);
  const detailStroke = isLightSwatch(colorFamily) ? "rgba(30, 38, 34, 0.35)" : "rgba(255, 255, 255, 0.4)";

  const fill =
    swatch === null
      ? "var(--color-line-strong)"
      : swatch.kind === "multi"
        ? `url(#multi-${shape})`
        : swatch.hex;

  return (
    <svg viewBox="0 0 100 125" role="img" aria-label="Garment illustration" width="100%" height="100%">
      {swatch?.kind === "multi" && (
        <defs>
          <linearGradient id={`multi-${shape}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="50%" stopColor={swatch.a} />
            <stop offset="50%" stopColor={swatch.b} />
          </linearGradient>
        </defs>
      )}
      <path d={OUTLINES[shape]} fill={fill} fillRule="evenodd" />
      {DETAILS[shape].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={detailStroke} strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </svg>
  );
}
