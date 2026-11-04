import styles from "./ProgressBar.module.css";

// A bar with a text equivalent: the numbers are always written out next to it,
// so the bar is a supplement, not the only way to read the progress. The fill
// is a scaled span (not a width) so the entrance animation stays on the
// compositor; the final state is the default, the animation is added only when
// the person hasn't asked for reduced motion.
export function ProgressBar({
  value,
  max,
  label,
  step = 0,
  tone = "espresso",
}: {
  value: number;
  max: number;
  label: string;
  // Position in a stack of bars; each one starts 80ms after the one before.
  step?: number;
  tone?: "espresso" | "rose" | "warn";
}) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const fraction = clamped / safeMax;
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
    >
      <span
        className={`${styles.fill} ${tone === "rose" ? styles.rose : tone === "warn" ? styles.warn : ""}`}
        style={{ "--fill": fraction, "--step": step } as React.CSSProperties}
      />
    </div>
  );
}
