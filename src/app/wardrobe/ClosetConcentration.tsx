"use client";

import { useState } from "react";
import type { ConcentrationRow } from "@/lib/wardrobeClusters";
import styles from "./concentration.module.css";

// How many categories show before "Show all". Enough to see where the
// closet leans without turning the card into a table.
const COLLAPSED_ROWS = 4;

// Colour says rank, so the fullest categories stand out: espresso for the top
// two, rose for the next two, blush for the rest. Categories with the same
// count share a tier, so a tie never makes one look fuller than another.
export function tierFor(rows: readonly ConcentrationRow[]): number[] {
  const tiers: number[] = [];
  rows.forEach((row, index) => {
    if (index > 0 && row.count === rows[index - 1].count) {
      tiers.push(tiers[index - 1]);
    } else {
      tiers.push(index < 2 ? 0 : index < 4 ? 1 : 2);
    }
  });
  return tiers;
}

const TIER_CLASS = ["tierTop", "tierMid", "tierLow"] as const;

// One row per category: the count against the largest category as a bar, the
// real count in words, and, for a well-stocked category, one plain sentence
// about what is repeated. Never a percentage.
export function ClosetConcentration({ rows }: { rows: ConcentrationRow[] }) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;

  const tiers = tierFor(rows);
  const canCollapse = rows.length > COLLAPSED_ROWS;
  const visible = canCollapse && !expanded ? rows.slice(0, COLLAPSED_ROWS) : rows;

  return (
    <section className={styles.panel} aria-labelledby="closet-concentration">
      <h2 id="closet-concentration" className={styles.title}>
        Where your closet is concentrated
      </h2>
      <p className={styles.sub}>Your fullest categories, and where you own near-duplicates.</p>
      <ul className={styles.rows} role="list" id="closet-concentration-rows">
        {visible.map((row, index) => (
          <li key={row.key} className={styles.row}>
            <span className={styles.label}>{row.label}</span>
            <span className={styles.bar} aria-hidden="true">
              <span
                className={`${styles.barFill} ${styles[TIER_CLASS[tiers[index]]]}`}
                style={{ width: `${Math.max(row.share * 100, 2)}%` }}
              />
            </span>
            <span className={styles.count}>
              {row.count} {row.count === 1 ? "piece" : "pieces"}
            </span>
            {row.sentence && (
              <span className={styles.sentence}>
                <span className={styles.sentenceDot} aria-hidden="true" />
                {row.sentence}
              </span>
            )}
          </li>
        ))}
      </ul>
      {canCollapse && (
        <button
          type="button"
          className={styles.more}
          aria-expanded={expanded}
          aria-controls="closet-concentration-rows"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Show fewer" : `Show all ${rows.length} categories`}
        </button>
      )}
    </section>
  );
}
