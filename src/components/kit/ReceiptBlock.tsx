import styles from "./kit.module.css";

export type ReceiptLine = { id: string; date: string; name: string; brand: string; price: string };

// Line items, a dashed rule, then the closing line. The closing line arrives
// already worded ("Left in your plan" / "Over your plan"); `over` only swaps
// it to the deep-rose accent.
export function ReceiptBlock({
  lines,
  moreCount,
  total,
}: {
  lines: ReceiptLine[];
  moreCount: number;
  total: { label: string; amount: string; over: boolean } | null;
}) {
  return (
    <div className={styles.receipt}>
      {lines.length === 0 ? (
        <p className={styles.receiptEmpty}>No purchases this month yet.</p>
      ) : (
        lines.map((line) => (
          <div key={line.id} className={styles.receiptLine}>
            <span className={styles.receiptDate}>{line.date}</span>
            <span className={styles.receiptName}>
              {line.name} <span className={styles.receiptBrand}>· {line.brand}</span>
            </span>
            <span className={styles.receiptPrice}>{line.price}</span>
          </div>
        ))
      )}
      {moreCount > 0 && <p className={styles.receiptMore}>+ {moreCount} more</p>}
      {total && (
        <>
          <hr className={styles.receiptRule} />
          <div className={`${styles.receiptTotal}${total.over ? ` ${styles.receiptTotalOver}` : ""}`}>
            <span>{total.label}</span>
            <span>{total.amount}</span>
          </div>
        </>
      )}
    </div>
  );
}
