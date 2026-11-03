import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

// Polaris empty state: an invitation, not an apology. A small mark, a
// heading that names the space, one line on what goes here, one action.
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <span className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <rect x="7" y="5" width="3" height="14" rx="1" />
          <rect x="14" y="5" width="3" height="14" rx="1" />
        </svg>
      </span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.text}>{children}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
