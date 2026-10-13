import type { WardrobeEntry } from "@/lib/wardrobeView";
import { HangingPiece } from "../wardrobe/Rack";
import styles from "./rackSlice.module.css";

// A short, static rail of the newest hanging pieces: the Wardrobe rack's
// hanger, clip, card and tag, without the scrolling. The grid shows as many
// of the pieces as fit on one row (3 or 4 on desktop, 2 on a phone); the
// rest are clipped, so nothing ever needs to scroll.
export function RackSlice({ items }: { items: WardrobeEntry[] }) {
  return (
    <ul className={styles.rail} role="list" aria-label="Recently added pieces">
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <HangingPiece item={item} menu={false} />
        </li>
      ))}
    </ul>
  );
}
