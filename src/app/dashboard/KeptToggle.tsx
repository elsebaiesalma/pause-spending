"use client";

import { useEffect, useState } from "react";
import type { KeptRange, KeptSummary } from "@/lib/dashboard/kept";
import styles from "./page.module.css";

const STORAGE_KEY = "pause:dashboard:kept-range";

function readStoredRange(): KeptRange {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "this_month" ? "this_month" : "all_time";
  } catch {
    return "all_time";
  }
}

function writeStoredRange(range: KeptRange): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, range);
  } catch {
    // Best-effort only - a private window or disabled storage just means
    // the choice doesn't persist across visits, nothing else breaks.
  }
}

// Both ranges are computed server-side up front (two cheap queries) so
// switching here is an instant, already-fetched swap - no loading state,
// no layout jump, no second round trip.
export function KeptToggle({ thisMonth, allTime }: { thisMonth: KeptSummary; allTime: KeptSummary }) {
  // Starts at "all_time" (the documented default) on every render, then
  // syncs to the stored choice once mounted - avoids a server/client
  // markup mismatch, since localStorage doesn't exist during SSR.
  const [range, setRange] = useState<KeptRange>("all_time");

  useEffect(() => {
    setRange(readStoredRange());
  }, []);

  const summary = range === "this_month" ? thisMonth : allTime;

  function choose(next: KeptRange) {
    setRange(next);
    writeStoredRange(next);
  }

  return (
    <div>
      <a href="/considering/let-go" className={styles.statValue} style={{ display: "block" }}>
        ${summary.totalKept.toFixed(0)}
      </a>
      <p className={styles.statNote}>
        {summary.itemsLetGo} item{summary.itemsLetGo === 1 ? "" : "s"} let go
      </p>
      <div className={styles.segmented} role="group" aria-label="Time range">
        <button
          type="button"
          className={styles.segmentedBtn}
          data-active={range === "this_month"}
          onClick={() => choose("this_month")}
        >
          This month
        </button>
        <button
          type="button"
          className={styles.segmentedBtn}
          data-active={range === "all_time"}
          onClick={() => choose("all_time")}
        >
          All time
        </button>
      </div>
    </div>
  );
}
