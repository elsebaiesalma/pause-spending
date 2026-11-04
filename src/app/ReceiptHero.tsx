"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { RECEIPT_LINES, feedLine, money, runningTotals, type ReceiptLine } from "@/lib/landing/receipt";
import styles from "./receiptHero.module.css";

// A new line prints this often while nobody has paused the receipt.
const PRINT_EVERY_MS = 1100;
// Lines kept on the paper at once. Older ones have scrolled off, and are
// counted in "+ N earlier items" so the total is still the whole tab.
const VISIBLE_LINES = 14;

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
// left, and a receipt on the right that keeps printing by itself, a new item
// every second or so, so the tab only ever grows. Hover it and a faint Pause
// button shows (clicking anywhere on the receipt does the same). Pausing
// stamps it PAUSED, strikes through the repeats and shows what stays in the
// plan, which is the product in one gesture.
//
// The finished, stamped receipt is the default ("static"): with reduced
// motion, with no script and before hydration the receipt is exactly that and
// nothing moves. Only once the page has loaded, and only when the visitor
// allows motion, does it start printing.
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
  const totals = runningTotals(extra);

  const printed: ReceiptLine[] = [...RECEIPT_LINES];
  for (let i = 0; i < extra; i += 1) printed.push(feedLine(i));
  const firstShown = Math.max(0, printed.length - VISIBLE_LINES);
  const shown = printed.slice(firstShown);

  function toggle() {
    setPaused((current) => !current);
  }

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>For the moment before checkout</span>
          <h1 id="hero-heading" className={styles.heading}>
            It adds up quietly.
          </h1>
          <p className={styles.body}>
            Three white tees and a coat, one tap at a time. PAUSE spots what you already own before you buy it
            again, and the money stays in your plan.
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
              <p className={styles.date} aria-hidden="true">
                An example, not real data
              </p>
              <hr className={styles.rule} />
              <div className={styles.lines} data-full={shown.length >= VISIBLE_LINES || undefined} aria-hidden="true">
                {firstShown > 0 && <p className={styles.earlier}>+ {firstShown} earlier items</p>}
                {shown.map((line, index) => (
                  <p
                    key={firstShown + index}
                    className={styles.line}
                    data-repeat={stamped && line.repeat ? "true" : undefined}
                    data-new={interactive && firstShown + index >= RECEIPT_LINES.length ? "true" : undefined}
                  >
                    <span>{line.name}</span>
                    <span className={styles.amount}>{line.price.toFixed(2)}</span>
                  </p>
                ))}
              </div>
              <div aria-hidden="true">
                <hr className={styles.rule} />
                <p className={`${styles.line} ${styles.total}`}>
                  <span>TOTAL</span>
                  <span className={styles.amount}>{money(stamped ? totals.afterPause : totals.all)}</span>
                </p>
                {stamped && (
                  <p className={`${styles.line} ${styles.kept}`}>
                    <span>KEPT IN YOUR PLAN</span>
                    <span className={styles.amount}>{money(totals.kept)}</span>
                  </p>
                )}
                {stamped && <span className={styles.stamp}>PAUSED</span>}
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
                    {mode === "paused" ? "▶" : "❚❚"}
                  </span>
                  {mode === "paused" ? "Resume" : "Pause"}
                </button>
              )}
            </div>
          </div>
          <figcaption className={styles.srOnly}>
            An example receipt that keeps printing new items. It starts with a white crew tee $34, a white linen tee
            $29, an oversized white tee $40 and a black wool coat $189, {money(292)} in all. When paused, PAUSE flags
            the repeats and shows what stays in the plan.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
