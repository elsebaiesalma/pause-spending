import styles from "./page.module.css";

// Next.js renders this automatically while the async DashboardPage server
// component is fetching, on every navigation to /dashboard - each block
// below is sized to match its real counterpart so nothing shifts once the
// real content swaps in.
export default function DashboardLoading() {
  return (
    <div className={`page page--wide ${styles.dashboardPage}`}>
      <div className={styles.skelTopBand}>
        <div className={styles.skelTopHalf}>
          <div className={styles.skelLine} />
          <div className={styles.skelValue} />
        </div>
        <div className={styles.skelTopHalf}>
          <div className={styles.skelLine} />
          <div className={styles.skelValue} />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.skelLine} style={{ width: "30%", marginBottom: "1rem" }} />
        <div className={styles.skelTrack}>
          <div className={styles.skelCard} />
          <div className={styles.skelCard} />
          <div className={styles.skelCard} />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.skelLine} style={{ width: "35%", marginBottom: "1rem" }} />
        <div className={styles.skelRow} />
        <div className={styles.skelRow} />
        <div className={styles.skelRow} />
      </div>
    </div>
  );
}
