import type { ReactNode } from "react";
import styles from "./kit.module.css";

// A labelled number with one line of context. With `href` the whole block is
// a link; without it, `children` can carry an inline action such as a form.
export function BigNumeral({
  label,
  value,
  note,
  href,
  children,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  href?: string;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className={styles.numeralLabel}>{label}</span>
      <span className={styles.numeralValue}>{value}</span>
      {note && <span className={styles.numeralNote}>{note}</span>}
      {children}
    </>
  );
  return href ? (
    <a href={href} className={styles.numeral}>
      {body}
    </a>
  ) : (
    <div className={styles.numeral}>{body}</div>
  );
}
