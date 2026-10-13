"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { formatUnlockWhen } from "@/lib/dashboard/unlockTime";
import styles from "./PauseConfirmation.module.css";

const AUTO_DISMISS_MS = 7000;
const PARAM = "paused";

// The pause route sends people back to Home as /dashboard?paused=<wait_until>.
// The time is read in the browser so it is shown in the viewer's own zone.
function subscribe() {
  return () => {};
}

function currentSearch(): string {
  return window.location.search;
}

export function parsePausedUntil(search: string, now: Date = new Date()): Date | null {
  const raw = new URLSearchParams(search).get(PARAM);
  if (!raw) return null;
  const until = new Date(raw);
  if (Number.isNaN(until.getTime())) return null;
  // Display only, but don't announce a time that makes no sense.
  const ahead = until.getTime() - now.getTime();
  return ahead > 0 && ahead < 31 * 24 * 60 * 60 * 1000 ? until : null;
}

// Brief, dismissible "Set aside" note. Plain, no celebration. It fades in
// (not at all with prefers-reduced-motion), closes on its own after a few
// seconds, and the ?paused marker is removed so a refresh doesn't repeat it.
export function PauseConfirmation() {
  const search = useSyncExternalStore(subscribe, currentSearch, () => "");
  const [dismissed, setDismissed] = useState(false);

  const until = dismissed ? null : parsePausedUntil(search);
  const visible = until !== null;

  function dismiss() {
    setDismissed(true);
    const url = new URL(window.location.href);
    url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, "", url);
  }

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!until) return null;

  return (
    <div className={styles.toast} role="status">
      <p className={styles.message}>Set aside. Nothing to do until {formatUnlockWhen(until)}.</p>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss">
        Dismiss
      </button>
    </div>
  );
}
