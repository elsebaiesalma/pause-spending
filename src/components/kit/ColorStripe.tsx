import { swatchFor } from "@/lib/colorSwatch";
import type { StripeSegment } from "@/lib/dashboard/colorStripe";
import styles from "./kit.module.css";

export function ColorStripe({ segments }: { segments: StripeSegment[] }) {
  const drawable = segments.filter((segment) => swatchFor(segment.colorFamily));
  if (drawable.length === 0) return null;

  const summary = drawable.map((segment) => `${segment.count} ${segment.colorFamily}`).join(", ");
  return (
    <div className={styles.stripe} role="img" aria-label={`Wardrobe colours: ${summary}`}>
      {drawable.map((segment) => {
        const swatch = swatchFor(segment.colorFamily)!;
        const background =
          swatch.kind === "multi" ? `linear-gradient(135deg, ${swatch.a} 50%, ${swatch.b} 50%)` : swatch.hex;
        return (
          <span key={segment.colorFamily} className={styles.stripeSegment} style={{ flexGrow: segment.count, background }} />
        );
      })}
    </div>
  );
}
