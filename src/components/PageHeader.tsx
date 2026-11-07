import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./PageHeader.module.css";

// One page header for every screen (Polaris page pattern): an optional back
// link for pages one level down, the title, an optional line of context, and
// at most one primary action on the right.
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      {back && (
        <Link href={back.href} className={styles.back}>
          <span aria-hidden="true">&larr;</span> {back.label}
        </Link>
      )}
      <div className={styles.row}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </header>
  );
}

export type TabItem = { href: string; label: string; count?: number; current: boolean };

// Views of the same list (Polaris tabs). Plain links, so each view has its
// own URL and works without JavaScript.
// `tour` marks the tabs as a stop on the demo tour (see DemoTour).
export function Tabs({ items, label, tour }: { items: TabItem[]; label: string; tour?: string }) {
  return (
    <nav className={styles.tabs} aria-label={label} data-tour={tour}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={styles.tab}
          aria-current={item.current ? "page" : undefined}
          scroll={false}
        >
          {item.label}
          {item.count !== undefined && <span className={styles.tabCount}>{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
