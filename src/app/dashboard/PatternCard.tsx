import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { PATTERN_MIN_DECIDED, type PauseBucket, type PausePatternData } from "@/lib/dashboard/pausePattern";
import styles from "./PatternCard.module.css";

function PatternRow({ label, bucket, step }: { label: string; bucket: PauseBucket; step: number }) {
  return (
    <li className={styles.row}>
      <p className={styles.rowText}>
        <span>{label}</span>
        <strong>
          Let go {bucket.letGo} of {bucket.total}
        </strong>
      </p>
      <ProgressBar
        value={bucket.letGo}
        max={bucket.total}
        label={`${label}: let go ${bucket.letGo} of ${bucket.total}`}
        step={step}
        tone="rose"
      />
    </li>
  );
}

// "What works for you": counts, never percentages. Hidden entirely until the
// first finished pause; before five it shows progress toward the pattern.
export function PatternCard({ pattern }: { pattern: PausePatternData }) {
  if (pattern.decided === 0) return null;

  if (!pattern.ready) {
    return (
      <section className={styles.card} aria-label="What works for you">
        <EmptyState title="Your pattern shows up after 5 pauses">
          PAUSE compares how often you let things go after 24 hours and after 7 days.
        </EmptyState>
        <ProgressBar
          value={pattern.decided}
          max={PATTERN_MIN_DECIDED}
          label={`${pattern.decided} of ${PATTERN_MIN_DECIDED} pauses`}
          tone="rose"
        />
        <p className={styles.basis}>
          {pattern.decided} of {PATTERN_MIN_DECIDED} pauses
        </p>
      </section>
    );
  }

  // Longest pauses first, matching the tip underneath; empty buckets are skipped.
  const rows = [
    { label: "7-day pauses", bucket: pattern.long },
    { label: "24-hour pauses", bucket: pattern.short },
  ].filter((row) => row.bucket.total > 0);

  return (
    <section className={styles.card} aria-labelledby="pattern-heading">
      <p className={styles.eyebrow}>What works for you</p>
      <h2 id="pattern-heading" className={styles.headline}>
        {pattern.headline}
      </h2>
      <ul className={styles.rows}>
        {rows.map((row, index) => (
          <PatternRow key={row.label} label={row.label} bucket={row.bucket} step={index} />
        ))}
      </ul>
      <p className={styles.basis}>{pattern.footnote}</p>
    </section>
  );
}
