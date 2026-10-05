import { swatchFor } from "@/lib/colorSwatch";

// Shared by the wardrobe grid and the pause screen's meta lines. Inlines
// its own structural style (rather than a CSS Module class) so it has no
// dependency on either page's stylesheet - it's a small enough atom that
// self-containment is simpler than a shared stylesheet just for this.
const DOT_STYLE = {
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: "50%",
  border: "1px solid var(--color-line-strong)",
  flexShrink: 0,
} as const;

// Decorative only - the colorName text next to it already carries the
// information accessibly, so this never needs its own label.
export function ColorDot({ colorFamily }: { colorFamily: string | null }) {
  const swatch = swatchFor(colorFamily);
  if (!swatch) return null;

  const background =
    swatch.kind === "multi" ? `linear-gradient(135deg, ${swatch.a} 50%, ${swatch.b} 50%)` : swatch.hex;

  return <span style={{ ...DOT_STYLE, background }} aria-hidden="true" />;
}
