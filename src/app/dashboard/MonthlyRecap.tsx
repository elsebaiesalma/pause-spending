"use client";

import { useSyncExternalStore } from "react";
import type { MonthlyRecapData } from "@/lib/dashboard/monthlyRecap";
import { dismiss, dismissKey, isDismissed, subscribeDismissals } from "@/lib/dashboard/dismissStore";
import styles from "./MonthlyRecap.module.css";

function dollars(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

// A quiet look back at last month, on Home for the first week only. The server
// render is always "not dismissed", so a person who dismissed it sees it for a
// frame before it folds away; the alternative (hiding until storage is read)
// would hide it for everyone whose storage is unavailable.
export function MonthlyRecap({ recap }: { recap: MonthlyRecapData }) {
  const key = dismissKey(recap.monthKey);
  const dismissed = useSyncExternalStore(
    subscribeDismissals,
    () => isDismissed(key),
    () => false
  );
  const { stats, monthLabel, comparison } = recap;

  return (
    <div className={`${styles.wrap} ${dismissed ? styles.dismissed : ""}`} data-dismissed={dismissed}>
      <div className={styles.inner}>
        <section className={styles.recap} aria-labelledby="recap-heading" aria-hidden={dismissed}>
          <button
            type="button"
            className={styles.close}
            onClick={() => dismiss(key)}
            aria-label={`Dismiss your ${monthLabel} recap`}
            tabIndex={dismissed ? -1 : 0}
          >
            <span aria-hidden="true">&#10005;</span>
          </button>
          <p className={styles.eyebrow}>Your month</p>
          <h2 id="recap-heading" className={styles.title}>
            Your {monthLabel} in PAUSE
          </h2>

          <dl className={styles.metrics}>
            <div className={styles.metric}>
              <dt>Paused</dt>
              <dd>{stats.paused}</dd>
              {comparison && <dd className={styles.note}>{comparison}</dd>}
            </div>
            <div className={styles.metric}>
              <dt>Let go</dt>
              <dd>{stats.letGo}</dd>
              {stats.paused > 0 && <dd className={styles.note}>of the {stats.paused} you paused</dd>}
            </div>
            <div className={styles.metric}>
              <dt>Saved</dt>
              <dd className={styles.accent}>{dollars(stats.saved)}</dd>
              <dd className={styles.note}>money you didn&rsquo;t spend</dd>
            </div>
            <div className={styles.metric}>
              <dt>Most resisted</dt>
              <dd className={styles.text}>{stats.mostResisted ? stats.mostResisted.label : "Nothing yet"}</dd>
              {stats.mostResisted && <dd className={styles.note}>{stats.mostResisted.count} let go</dd>}
            </div>
          </dl>

          <a href="/considering?tab=let-go" className={`btn ${styles.cta}`} tabIndex={dismissed ? -1 : 0}>
            See {monthLabel}&rsquo;s decisions
          </a>
        </section>
      </div>
    </div>
  );
}
