"use client";

import { useSyncExternalStore } from "react";
import { isGuideHidden, setGuideHidden, subscribeGuideVisibility } from "@/lib/dashboard/guideVisibility";

// Only offered once the guide has been closed in this browser.
export function ShowGuideButton() {
  const hidden = useSyncExternalStore(subscribeGuideVisibility, isGuideHidden, () => false);
  if (!hidden) return null;
  return (
    <p>
      <button type="button" className="btn-quiet" onClick={() => setGuideHidden(false)}>
        Show “Get to know PAUSE” on Home again
      </button>
    </p>
  );
}
