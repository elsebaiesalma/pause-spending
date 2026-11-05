"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { WINDOW_LINES, lineAt, money, tabTotals } from "@/lib/landing/receipt";
import styles from "./receiptHero.module.css";

// A new line scrolls in this often while nobody has paused the receipt. The
// slide itself (receiptHero.module.css) is shorter, so there is a beat between.
const PRINT_EVERY_MS = 1300;

type Mode = "static" | "running" | "paused";

const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";

// Whether this visitor allows motion. The server (and the render that
// hydrates) answers false, so the first paint is always the finished receipt.
function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// The opening of the landing page: the headline and call to action on the
// left, and a receipt on the right that scrolls by itself. The paper stays the
// same size: a window of eight lines, new items arriving at the bottom while the
// tab slides up and the total counts up beneath it. A faint Pause button sits
// in the middle of the paper (clicking the paper does the same). Pausing stops
// the scroll, strikes through the repeats and shows what stays in the plan,
// which is the product in one gesture.
//
// The finished receipt (repeats struck, what stays in the plan shown) is the
// default ("static"): with reduced motion, with no script and before hydration
// the receipt is exactly that and nothing moves. Only once the page has loaded,
// and only when the visitor allows motion, does it start scrolling.
export function ReceiptHero({ actions, note }: { actions: ReactNode; note?: ReactNode }) {
  const motionOk = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false
  );
  const [paused, setPaused] = useState(false);
  const mode: Mode = !motionOk ? "static" : paused ? "paused" : "running";
  const [extra, setExtra] = useState(0);
  const figureRef = useRef<HTMLElement>(null);
  const visibleRef = useRef(true);

  // Don't print while the receipt is off screen, so coming back to it isn't a
  // wall of lines, and not while the tab is in the background.
  useEffect(() => {
    const figure = figureRef.current;
    if (!figure || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    });
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mode !== "running") return;
    const timer = window.setInterval(() => {
      if (visibleRef.current && !document.hidden) setExtra((n) => n + 1);
    }, PRINT_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [mode]);

  const interactive = mode !== "static";
  const stamped = mode !== "running";
  const totals = tabTotals(extra);

  // Before the first tick the window shows lines 0 to 7. After it, one line
  // more is rendered above the window and the whole track slides up by a line
  // (CSS), which ends looking exactly like the next tick's starting frame.
  const first = Math.max(0, extra - 1);
  const rendered = Array.from({ length: extra === 0 ? WINDOW_LINES : WINDOW_LINES + 1 }, (_, k) => lineAt(first + k));

  function toggle() {
    setPaused((current) => !current);
  }

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>For the moment before checkout</span>
          <h1 id="hero-heading" className={styles.heading}>
            “I don’t have anything like it.” Your closet might disagree.
          </h1>
          <p className={styles.body}>
            Add a pause between wanting it and buying it.
          </p>
          <div className={styles.actions}>{actions}</div>
          {note && <p className={styles.note}>{note}</p>}
        </div>

        <figure className={styles.receiptWrap} ref={figureRef}>
          <span className={styles.slot} aria-hidden="true" />
          <div className={styles.feed}>
            {/* Clicking the paper pauses it; the button inside is the same
                control for a keyboard and for anyone who doesn't know the paper
                is clickable. */}
            <div
              className={styles.receipt}
              data-mode={mode}
              data-clickable={interactive || undefined}
              onClick={interactive ? toggle : undefined}
              aria-hidden={interactive ? undefined : "true"}
            >
              <p className={styles.shop} aria-hidden="true">
                CHECKOUT &middot; ORDER 0429
              </p>
              <hr className={styles.rule} />
              <div className={styles.window} data-moving={interactive || undefined}>
                <div key={extra} className={styles.track} data-slide={extra > 0 || undefined} aria-hidden="true">
                  {rendered.map((line, index) => (
                    <p key={first + index} className={styles.line} data-repeat={stamped && line.repeat ? "true" : undefined}>
                      <span>{line.name}</span>
                      <span className={styles.amount}>{line.price.toFixed(2)}</span>
                    </p>
                  ))}
                </div>
                {interactive && (
                  <button
                    type="button"
                    className={styles.pause}
                    aria-pressed={mode === "paused"}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle();
                    }}
                  >
                    <span className={styles.pauseIcon} aria-hidden="true">
                      {/* SVG both ways: the "▶" character turns into a colour emoji on iPhone. */}
                      {mode === "paused" ? (
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" focusable="false">
                          <path d="M4 2.6v10.8a.8.8 0 0 0 1.2.7l8.6-5.4a.8.8 0 0 0 0-1.4L5.2 1.9A.8.8 0 0 0 4 2.6z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" focusable="false">
                          <rect x="3" y="2" width="3.5" height="12" rx="1" />
                          <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                        </svg>
                      )}
                    </span>
                    {mode === "paused" ? "Resume" : "Pause"}
                  </button>
                )}
              </div>
              <div aria-hidden="true">
                <hr className={styles.rule} />
                <p className={`${styles.line} ${styles.total}`}>
                  <span>TOTAL</span>
                  <span className={styles.amount}>{money(stamped ? totals.afterPause : totals.all)}</span>
                </p>
                {/* Always in the layout, so showing it never changes the paper's size. */}
                <p className={`${styles.line} ${styles.kept}`} data-hidden={!stamped || undefined}>
                  <span>KEPT IN YOUR PLAN</span>
                  <span className={styles.amount}>{money(totals.kept)}</span>
                </p>
              </div>
            </div>
          </div>
          <figcaption className={styles.srOnly}>
            An example, not real data: a checkout receipt that keeps scrolling with new items. It starts with a white
            crew tee $34, a white linen tee $29, an oversized white tee $40 and a black wool coat $189, {money(292)} in
            all. When paused, PAUSE flags the repeats and shows what stays in the plan.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
