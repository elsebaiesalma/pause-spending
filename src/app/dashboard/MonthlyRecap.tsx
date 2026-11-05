"use client";

import { useSyncExternalStore } from "react";
import type { MonthlyRecapData } from "@/lib/dashboard/monthlyRecap";
import { dismiss, dismissKey, isDismissed, subscribeDismissals } from "@/lib/dashboard/dismissStore";
import styles from "./MonthlyRecap.module.css";

function dollars(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

// A quiet look back, on Home: last month for the first week of a new month, or the
// current month for demo accounts. The server
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
          <div className={styles.head}>
            <p className={styles.eyebrow}>Your month</p>
            <h2 id="recap-heading" className={styles.title}>
              Your {monthLabel} in PAUSE
            </h2>
          </div>

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

          {recap.tip && (
            <p className={styles.tip}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {/* A lit bulb: the glass and base, then short rays around it. */}
                <path d="M9.5 20h5" fill="none" />
                <path d="M12 6.5a4.5 4.5 0 0 0-2.6 8.2c.4.4.6.9.6 1.5h4c0-.6.2-1.1.6-1.5A4.5 4.5 0 0 0 12 6.5Z" />
                <path d="M12 1.5v1.5M4.6 4.6l1.1 1.1M19.4 4.6l-1.1 1.1M1.5 11H3M21 11h1.5" fill="none" />
              </svg>
              <span>
                <span className="sr-only">Tip: </span>
                {recap.tip}
              </span>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
