import { WarnIcon } from "@/components/WarnIcon";
import styles from "./kit.module.css";

export type ReceiptRow = { label: string; amount: string };

// Rows, a dashed rule, then the closing line. The closing line arrives already
// worded ("Left $190", or "$40 over your plan" with no amount); `over` only
// swaps it to the deep-rose accent, never a warning red.
export function ReceiptBlock({
  rows,
  closing,
}: {
  rows: ReceiptRow[];
  closing: { label: string; amount?: string; over: boolean };
}) {
  return (
    <div className={styles.receipt}>
      {rows.map((row) => (
        <div key={row.label} className={styles.receiptRow}>
          <span>{row.label}</span>
          <span className={styles.receiptAmount}>{row.amount}</span>
        </div>
      ))}
      <hr className={styles.receiptRule} />
      <div className={`${styles.receiptTotal}${closing.over ? ` ${styles.receiptTotalOver}` : ""}`}>
        <span>
          {closing.over && <WarnIcon />} {closing.label}
        </span>
        {closing.amount && <span className={styles.receiptAmount}>{closing.amount}</span>}
      </div>
    </div>
  );
}
