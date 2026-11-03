import { GarmentSilhouette, silhouetteForItem } from "@/app/wardrobe/GarmentSilhouette";
import styles from "./ItemArt.module.css";

// An item's photo, or for items without one (the sample closet) the app's
// garment drawing, or a labelled tile; never an empty gray box. Fills its
// container, which sets the size and shape.
export function ItemArt({
  item,
}: {
  item: { category: string | null; itemName: string | null; colorFamily: string | null; imageUrl: string | null };
}) {
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.photo} src={item.imageUrl} alt={item.itemName ?? "Item"} />;
  }
  const shape = silhouetteForItem(item.category, item.itemName ?? "");
  if (shape) {
    return (
      <div className={styles.drawing}>
        <GarmentSilhouette shape={shape} colorFamily={item.colorFamily} />
      </div>
    );
  }
  return (
    <div className={styles.label}>
      <span>{item.category || "Item"}</span>
    </div>
  );
}
