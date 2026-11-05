"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import type { ConcentrationRow } from "@/lib/wardrobeClusters";
import styles from "./concentration.module.css";

// On a phone only this many categories show before "Show all". From tablet
// width every category is shown, in two columns, so there is nothing to open.
const COLLAPSED_ROWS = 4;

// Distinct steps from espresso through plum and deep rose to light pink, far
// enough apart that neighbours never read as the same colour (tints of one hue
// did). The count beside each bar carries the number, so colour is never the
// only cue; the shaded bars sit on a paler track so the light steps still show.
export const RANK_SHADES = ["#2a1208", "#5c2430", "#8e4752", "#b35f6d", "#cf8f98", "#e6bcc2"] as const;

// One shade per distinct count, darkest for the highest; equal counts share a
// shade, and past the last step the lightest one repeats.
export function shadesByCount(counts: number[]): Map<number, string> {
  const distinct = [...new Set(counts)].sort((a, b) => b - a);
  return new Map(distinct.map((count, rank) => [count, RANK_SHADES[Math.min(rank, RANK_SHADES.length - 1)]]));
}

// One row per category: a progress bar of that category's share of the whole
// closet (the max is the real total, as Polaris asks), the plain count beside
// it ("5 of 30 pieces"), and, for a well-stocked category, one sentence about
// what is repeated. Never a percentage. Bars are shaded by count: the fullest
// category is the darkest, every category with the same count shares a shade,
// and each lower count is lighter (see shadesByCount). The near-duplicate
// sentence (with its dot) carries the warning, not a different bar colour.
export function ClosetConcentration({ rows }: { rows: ConcentrationRow[] }) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const shades = shadesByCount(rows.map((row) => row.count));
  const canCollapse = rows.length > COLLAPSED_ROWS;

  return (
    <section className={styles.panel} aria-labelledby="closet-concentration">
      <h2 id="closet-concentration" className={styles.title}>
        Where your closet is concentrated
      </h2>
      <p className={styles.sub}>Your fullest categories, and where you own near-duplicates.</p>
      <ul className={styles.rows} role="list" id="closet-concentration-rows">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className={styles.row}
            data-extra={canCollapse && index >= COLLAPSED_ROWS && !expanded ? "" : undefined}
          >
            <span className={styles.label}>{row.label}</span>
            <span className={styles.count}>
              {row.count} of {total} {total === 1 ? "piece" : "pieces"}
            </span>
            <span className={styles.bar}>
              <ProgressBar
                value={row.count}
                max={total}
                label={`${row.label}: ${row.count} of ${total} pieces in your closet`}
                step={index}
                shade={shades.get(row.count)}
              />
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
