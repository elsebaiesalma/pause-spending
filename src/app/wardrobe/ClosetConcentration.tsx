import type { ConcentrationRow } from "@/lib/wardrobeClusters";
import styles from "./concentration.module.css";

// One row per category: the count against the largest category as a bar, the
// real count in words, and, for a well-stocked category, one plain sentence
// about what is repeated. Never a percentage.
export function ClosetConcentration({ rows }: { rows: ConcentrationRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="closet-concentration">
      <h2 id="closet-concentration" className={styles.title}>
        Where your closet is concentrated
      </h2>
      <ul className={styles.rows} role="list">
        {rows.map((row) => (
          <li key={row.key} className={styles.row}>
            <span className={styles.label}>{row.label}</span>
            <span className={styles.bar} aria-hidden="true">
              <span className={styles.barFill} style={{ width: `${Math.max(row.share * 100, 2)}%` }} />
            </span>
            <span className={styles.count}>
              {row.count} {row.count === 1 ? "piece" : "pieces"}
            </span>
            {row.sentence && <span className={styles.sentence}>{row.sentence}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
