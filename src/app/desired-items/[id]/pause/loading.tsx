import styles from "./page.module.css";

// Next.js renders this automatically while the async PauseScreenPage server
// component is fetching (similarity matching, redundancy explanation,
// budget) - each block below is sized to match its real counterpart so
// nothing shifts once the real content swaps in.
export default function PauseScreenLoading() {
  return (
    <div className="page">
      <span className="page__eyebrow">Before you buy</span>

      <div className={styles.skelWantedItem}>
        <div className={styles.skelImage} />
        <div style={{ flex: 1 }}>
          <div className={styles.skelLineShort} style={{ marginTop: 0, width: "25%" }} />
          <div className={styles.skelLine} style={{ width: "70%", height: "1.6rem" }} />
          <div className={styles.skelLineShort} />
        </div>
      </div>

      <div className="section">
        <div className={styles.skelLineShort} style={{ marginTop: 0, width: "40%" }} />
        <div className={styles.skelTrack}>
          <div className={styles.skelCard} />
          <div className={styles.skelCard} />
          <div className={styles.skelCard} />
        </div>
      </div>

      <div className="section">
        <div className={styles.skelLineShort} style={{ marginTop: 0, width: "35%" }} />
        <div className={styles.skelLine} style={{ width: "60%" }} />
        <div className={styles.skelLine} style={{ width: "45%" }} />
      </div>
    </div>
  );
}
