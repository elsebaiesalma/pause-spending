import type { ReactNode } from "react";
import Link from "next/link";
import type { DesiredItem, WardrobeItem } from "@prisma/client";
import { ItemArt } from "@/components/ItemArt";
import { itemStatus, STATUS_BADGE, STATUS_LABEL } from "@/lib/considering/itemStatus";
import styles from "./page.module.css";

// One row on the Decisions page. The name opens the item's own page; the
// badge says which status it's in; `meta` and `actions` vary by tab.
export function DecisionRow({
  item,
  meta,
  note,
  actions,
  badge,
  kept,
}: {
  item: DesiredItem;
  meta?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  // Replaces the status badge, e.g. "Bought after a pause" on the Bought tab.
  badge?: { label: string; className: string };
  // On Let go rows: the piece you already own that won. Text first, picture second.
  kept?: WardrobeItem;
}) {
  const price = item.price ? Number(item.price) : null;
  const status = itemStatus(item);
  return (
    <div className={styles.row}>
      <div className={styles.rowTop}>
        <div>
          {item.brand && <p className={styles.rowBrand}>{item.brand}</p>}
          <Link href={`/desired-items/${item.id}`} className={styles.rowName}>
            {item.itemName || "Untitled item"}
          </Link>
        </div>
        {price !== null && <span className={styles.rowPrice}>${price.toFixed(0)}</span>}
      </div>
      <p className={styles.rowMeta}>
        <span className={badge?.className ?? STATUS_BADGE[status]}>{badge?.label ?? STATUS_LABEL[status]}</span>
        {meta && <span>{meta}</span>}
      </p>
      {kept && (
        <p className={styles.kept}>
          <span className={styles.keptArt} aria-hidden="true">
            <ItemArt item={kept} />
          </span>
          <span>
            <span className={styles.keptLabel}>You kept</span>
            <span className={styles.keptName}>{kept.itemName}</span>
          </span>
        </p>
      )}
      {note && <p className={styles.rowReflection}>{note}</p>}
      {actions && <div className={styles.rowActions}>{actions}</div>}
    </div>
  );
}
