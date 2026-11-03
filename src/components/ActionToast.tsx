"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./ActionToast.module.css";

const AUTO_DISMISS_MS = 5000;

// Plain confirmations after a decision (Polaris toast): past tense, no
// exclamation marks, no celebration. Keyed by ?done= from the resolve route.
export const TOAST_MESSAGES: Record<string, string> = {
  "let-go": "Let go. It's on your let-go list.",
  undecided: "Moved to Undecided. Come back to it any time.",
};

function subscribe() {
  return () => {};
}

function currentSearch(): string {
  return window.location.search;
}

export function toastMessageFor(search: string): string | null {
  const done = new URLSearchParams(search).get("done");
  return done ? (TOAST_MESSAGES[done] ?? null) : null;
}

export function ActionToast() {
  const search = useSyncExternalStore(subscribe, currentSearch, () => "");
  const [dismissed, setDismissed] = useState(false);
  const message = dismissed ? null : toastMessageFor(search);

  useEffect(() => {
    if (!message) return;
    // Remove the marker so a refresh doesn't repeat the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("done");
    window.history.replaceState(null, "", url.toString());
    const timer = window.setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) return null;
  return (
    <div className={styles.toast} role="status">
      <span>{message}</span>
      <button type="button" className={styles.close} onClick={() => setDismissed(true)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
