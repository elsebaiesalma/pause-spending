import { URGE_MARKS } from "@/lib/landing/urgeCurve";
import styles from "./urgeTexts.module.css";

// The phone version of the urge curve: four texts you send yourself as the
// hours pass. Each one is quieter than the last, so the urge fades down the
// screen the way the curve fades across it. Same four moments and words as the
// chart, so the two never disagree.
export function UrgeTexts() {
  return (
    <figure className={styles.thread}>
      <figcaption className={styles.caption}>Texts to yourself</figcaption>
      <ol className={styles.list}>
        {URGE_MARKS.map((mark, index) => (
          <li key={mark.hour} className={styles.item} data-step={index}>
            <span className={styles.hour}>{mark.hour}</span>
            <p className={styles.bubble}>{mark.thought}</p>
          </li>
        ))}
      </ol>
    </figure>
  );
}
