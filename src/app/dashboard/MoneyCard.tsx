import type { ReactNode } from "react";
import styles from "./MoneyCard.module.css";

// The shape shared by the monthly plan and the savings goal, so the two cards
// sit side by side with every row on the same line: a label and title with an
// edit button on the right, one progress bar, one figures row, one note.
// Rows are always rendered (the note falls back to a blank line), so nothing
// shifts when one card has less to say than the other.
export function MoneyCard({
  eyebrow,
  title,
  titleId,
  action,
  bar,
  left,
  right,
  rightWarn = false,
  note,
  children,
}: {
  children?: ReactNode;
  eyebrow: string;
  title: string;
  titleId: string;
  // The edit button, already built: a link to Budget or the goal sheet.
  action: ReactNode;
  bar: ReactNode;
  left: ReactNode;
  right: ReactNode;
  rightWarn?: boolean;
  note?: ReactNode;
}) {
  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <header className={styles.head}>
        <div className={styles.titles}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        </div>
        <div className={styles.action}>{action}</div>
      </header>
      {bar}
      <p className={styles.figures}>
        <strong>{left}</strong>
        <span className={rightWarn ? styles.warn : undefined}>{right}</span>
      </p>
      <p className={styles.note}>{note ?? " "}</p>
      {children}
    </section>
  );
}

// Class for the edit button on either card, so both read the same.
export const EDIT_BUTTON_CLASS = `btn ${styles.editButton}`;
