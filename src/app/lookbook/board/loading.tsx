import styles from "./board.module.css";

// Shown while the board page waits for a suggested outfit. Static and quiet.
export default function BoardLoading() {
  return (
    <div className={styles.shell} aria-busy="true">
      <p className={styles.loading}>Arranging a look from your closet</p>
    </div>
  );
}
