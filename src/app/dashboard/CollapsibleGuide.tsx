"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isGuideMinimized, setGuideMinimized, subscribeGuideMinimized } from "@/lib/dashboard/guideVisibility";
import styles from "./SetupGuide.module.css";

// Wraps the setup guide with a Minimize / Expand button. Minimized, it keeps
// its title, count and progress bar and hides the steps. The server render is
// always the open guide; the browser's remembered choice applies after.
export function CollapsibleGuide({ children }: { children: ReactNode }) {
  const minimized = useSyncExternalStore(subscribeGuideMinimized, isGuideMinimized, () => false);

  return (
    <div className={styles.collapsible} data-minimized={minimized}>
      {children}
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={!minimized}
        aria-controls="setup-guide-steps"
        onClick={() => setGuideMinimized(!minimized)}
      >
        {minimized ? "Expand" : "Minimize"}
        <span className={styles.chevron} aria-hidden="true" />
      </button>
    </div>
  );
}
