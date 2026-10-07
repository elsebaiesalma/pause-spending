"use client";

import { useEffect, useState } from "react";
import styles from "./WelcomeIntro.module.css";

const SEEN_KEY = "pause:welcome-seen";
const DURATION_MS = 1400;

// Runs while the HTML is still being parsed, before first paint, so a
// returning visitor (or someone who prefers reduced motion) never sees the
// overlay for even a frame. The overlay is in the server HTML, so a first
// visit has no flash of the page underneath either.
const GATE = `(function(){try{var o=document.getElementById("welcome-intro");if(!o)return;if(localStorage.getItem(${JSON.stringify(
  SEEN_KEY
)})||matchMedia("(prefers-reduced-motion: reduce)").matches){o.setAttribute("data-skip","")}}catch(e){}})();`;

// A brief "Welcome" over the Connect Gmail page on a person's first visit:
// it fades and slides in, holds, then fades out to reveal the page. Under
// 1.5s, tap (or Enter/Escape) to skip, and none of it for anyone who has
// prefers-reduced-motion set. Opacity and a short slide only - nothing
// flashes or strobes.
export function WelcomeIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const overlay = document.getElementById("welcome-intro");
    // A skipped overlay is already hidden by its data-skip attribute.
    if (!overlay || overlay.hasAttribute("data-skip")) return;
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private window or blocked storage: it just plays again next visit.
    }
    const timer = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        id="welcome-intro"
        className={styles.overlay}
        role="button"
        tabIndex={0}
        aria-label="Welcome. Tap to skip."
        suppressHydrationWarning
        onClick={() => setVisible(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "Escape") setVisible(false);
        }}
      >
        <span className={styles.word}>Welcome</span>
      </div>
      <script dangerouslySetInnerHTML={{ __html: GATE }} />
    </>
  );
}
