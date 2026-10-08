import styles from "./page.module.css";

// Rendered while the async DashboardPage fetches. Each block roughly matches
// its real counterpart's height so nothing shifts when the content swaps in.
export default function DashboardLoading() {
  return (
    <div className={`page ${styles.home}`}>
      <div className={`${styles.skel} ${styles.skelHero}`} />
      <div className={`${styles.skel} ${styles.skelAdd}`} />
      <div className={styles.skelNumerals}>
        <div className="stack">
          <div className={`${styles.skel} ${styles.skelBlock}`} />
          <div className={`${styles.skel} ${styles.skelReceipt}`} />
        </div>
        <div className={`${styles.skel} ${styles.skelBlock}`} />
      </div>
    </div>
  );
}
