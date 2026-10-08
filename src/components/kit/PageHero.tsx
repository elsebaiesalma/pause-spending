import styles from "./kit.module.css";

export function PageHero({ eyebrow, title, pending = false }: { eyebrow: string; title: string; pending?: boolean }) {
  return (
    <header className={`${styles.hero}${pending ? ` ${styles.hidden}` : ""}`} aria-hidden={pending || undefined}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h1 className={styles.heroTitle}>{title}</h1>
    </header>
  );
}
