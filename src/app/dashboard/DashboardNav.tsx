import styles from "./page.module.css";

// A standalone piece of UI, rendered on every primary page (Dashboard,
// Considering, its let-go sub-page) rather than being dashboard-specific -
// kept in this folder since it started here, but its own props (no
// dashboard-specific data) so it can keep moving to more pages without
// rework.
const DESTINATIONS = [
  { href: "/dashboard", label: "Home", key: "home" },
  { href: "/wardrobe", label: "Wardrobe", key: "wardrobe" },
  { href: "/considering", label: "Considering", key: "considering" },
  { href: "/settings", label: "Settings", key: "settings" },
] as const;

export type NavDestinationKey = (typeof DESTINATIONS)[number]["key"];

export function DashboardTopNav({ active }: { active: NavDestinationKey }) {
  return (
    <nav className={styles.topNav}>
      <div className={styles.topNavLinks}>
        {DESTINATIONS.map((d) => (
          <a key={d.href} href={d.href} className={styles.topNavLink} aria-current={d.key === active ? "page" : undefined}>
            {d.label}
          </a>
        ))}
      </div>
      <a href="/desired-items/new" className="btn btn-primary">
        Add item
      </a>
    </nav>
  );
}

export function DashboardBottomTabBar({ active }: { active: NavDestinationKey }) {
  return (
    <nav className={styles.bottomTabBar} aria-label="Primary">
      <a href="/dashboard" className={styles.tabItem} aria-current={active === "home" ? "page" : undefined}>
        Home
      </a>
      <a href="/wardrobe" className={styles.tabItem} aria-current={active === "wardrobe" ? "page" : undefined}>
        Wardrobe
      </a>
      <a href="/desired-items/new" className={styles.tabItemAdd} aria-label="Add item">
        +
      </a>
      <a
        href="/considering"
        className={styles.tabItem}
        aria-current={active === "considering" ? "page" : undefined}
      >
        Considering
      </a>
      <a href="/settings" className={styles.tabItem} aria-current={active === "settings" ? "page" : undefined}>
        Settings
      </a>
    </nav>
  );
}
