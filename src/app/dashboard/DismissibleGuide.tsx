"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { isGuideHidden, setGuideHidden, subscribeGuideVisibility } from "@/lib/dashboard/guideVisibility";
import styles from "./SetupGuide.module.css";

// Wraps the setup guide with a close button. The server render always shows the
// guide (the finished state); the browser's remembered choice hides it after.
export function DismissibleGuide({ children }: { children: ReactNode }) {
  const remembered = useSyncExternalStore(subscribeGuideVisibility, isGuideHidden, () => false);
  const [closedNow, setClosedNow] = useState(false);
  if (remembered || closedNow) return null;

  return (
    <div className={styles.dismissible}>
      {children}
      <button
        type="button"
        className={styles.close}
        aria-label="Close Get to know PAUSE"
        onClick={() => {
          setClosedNow(true);
          setGuideHidden(true);
        }}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
