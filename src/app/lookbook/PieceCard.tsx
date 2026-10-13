import { ItemImage } from "../wardrobe/WardrobeParts";
import styles from "./lookbook.module.css";

// One piece on a board: its photo card as it is (no cutout), or the designed
// placeholder when there is no photo. Presentational only, so the editable
// board and the saved-look thumbnails draw pieces identically.
export function PieceCard({
  name,
  imageUrl,
  category,
  compact = false,
}: {
  name: string;
  imageUrl: string | null;
  category: string | null;
  compact?: boolean;
}) {
  return (
    <div className={styles.pieceCard}>
      <ItemImage
        item={{ imageUrl, displayName: name, category }}
        sizes={compact ? "8rem" : "(min-width: 900px) 16rem, 45vw"}
        compact={compact}
      />
    </div>
  );
}
