import { GarmentSilhouette, silhouetteForItem } from "@/app/wardrobe/GarmentSilhouette";
import { getOutfitSuggestions } from "@/lib/stillWantIt/outfits";
import styles from "./page.module.css";

// Async on purpose: the outfit call goes to the Anthropic API, so the page
// streams the rest of its content first and this section fills in under
// <OutfitSkeleton /> (see page.tsx).
export async function OutfitSection({ userId, desiredItemId }: { userId: string; desiredItemId: string }) {
  const result = await getOutfitSuggestions(userId, desiredItemId);

  if (!result) {
    return <p className={styles.note}>Outfit ideas aren&apos;t available for this item.</p>;
  }
  if (result.status === "unavailable") {
    return <p className={styles.note}>Outfit ideas couldn&apos;t load just now. Try again in a moment.</p>;
  }
  if (result.status === "too_small") {
    return <p className={styles.note}>Not enough pieces yet to suggest an outfit.</p>;
  }
  if (result.outfits.length === 0) {
    return <p className={styles.note}>No outfit suggestions for this one yet.</p>;
  }

  return (
    <div className={styles.outfits}>
      {result.outfits.map((outfit, index) => (
        <figure key={index} className={styles.outfit}>
          <div className={styles.collage} data-count={outfit.items.length}>
            {outfit.items.map((item) => (
              <div key={item.id} className={styles.collageCell}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.itemName} loading="lazy" />
                ) : (
                  <CategoryPlaceholder category={item.category} itemName={item.itemName} colorFamily={item.colorFamily} />
                )}
              </div>
            ))}
          </div>
          <figcaption className={styles.outfitNote}>{outfit.description}</figcaption>
        </figure>
      ))}
    </div>
  );
}

// Static skeleton for the outfit section while it loads. No animation, per
// the page's no-motion rule.
export function OutfitSkeleton() {
  return (
    <div className={styles.outfits} aria-busy="true" aria-label="Loading outfit ideas">
      {[0, 1].map((index) => (
        <div key={index} className={styles.skeletonOutfit}>
          <div className={styles.skeletonCollage} />
          <div className={styles.skeletonLine} />
        </div>
      ))}
    </div>
  );
}

function CategoryPlaceholder({
  category,
  itemName,
  colorFamily,
}: {
  category: string | null;
  itemName: string;
  colorFamily: string | null;
}) {
  const shape = silhouetteForItem(category, itemName);
  if (shape) {
    return <GarmentSilhouette shape={shape} colorFamily={colorFamily} />;
  }
  return <span className={styles.placeholderLabel}>{category ?? "Item"}</span>;
}
