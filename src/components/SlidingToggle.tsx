"use client";

import type { CSSProperties } from "react";
import styles from "./SlidingToggle.module.css";

// Two or more options in one pill. The dark highlight slides from one option
// to the next (CSS transform, off when the person prefers reduced motion), and
// each option is a real button with aria-pressed, so it is as accessible as a
// row of separate buttons.
export function SlidingToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  return (
    <div
      className={styles.toggle}
      role="group"
      aria-label={label}
      style={{ "--count": options.length, "--index": index } as CSSProperties}
    >
      <span className={styles.thumb} aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
