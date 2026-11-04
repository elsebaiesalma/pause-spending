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

// Goal confirmations arrive as ?goal= from /api/goal. Its errors stay inline
// next to the form (GoalStatus), where the person can fix them.
export const GOAL_TOASTS: Record<string, string> = {
  saved: "Goal saved.",
  removed: "Goal removed.",
};

export function toastMessageFor(search: string): string | null {
  const params = new URLSearchParams(search);
  const done = params.get("done");
  if (done && TOAST_MESSAGES[done]) return TOAST_MESSAGES[done];
  const goal = params.get("goal");
  return goal ? (GOAL_TOASTS[goal] ?? null) : null;
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
    if (url.searchParams.get("goal") && GOAL_TOASTS[url.searchParams.get("goal")!]) url.searchParams.delete("goal");
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
