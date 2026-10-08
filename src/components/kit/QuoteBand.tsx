import styles from "./kit.module.css";

export function QuoteBand({ text, source }: { text: string; source: string }) {
  return (
    <figure className={styles.quote}>
      <blockquote className={styles.quoteText}>{text}</blockquote>
      <figcaption className={styles.quoteSource}>{source}</figcaption>
    </figure>
  );
}
