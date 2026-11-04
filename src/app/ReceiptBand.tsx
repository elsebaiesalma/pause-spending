"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RECEIPT_LINES, money, receiptPhase, receiptTotals } from "@/lib/landing/receipt";
import styles from "./receiptBand.module.css";

// "It adds up quietly." A receipt prints as you scroll, a PAUSE stamp lands,
// the two repeat tees are struck through, and the receipt tears off into the
// closing call to action.
//
// The finished, stamped receipt is the default: with reduced motion, with no
// JavaScript, and before hydration the band is a normal-height section showing
// that state. Only when motion is allowed does the script make it a tall,
// sticky scene and drive it from the scroll position, by editing a CSS
// variable (--p) and a phase attribute rather than React state.
export function ReceiptBand({ cta }: { cta: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  const totals = receiptTotals();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

    root.dataset.live = "true";
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const progress = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 1;
      root.style.setProperty("--p", progress.toFixed(4));
      const phase = String(receiptPhase(progress));
      if (root.dataset.phase !== phase) root.dataset.phase = phase;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete root.dataset.live;
      root.style.removeProperty("--p");
      root.dataset.phase = "2";
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.band} data-phase="2" aria-label="What a month of impulse buys looks like">
      <div className={styles.stage}>
        <div className={styles.copy}>
          <div className={styles.copyBlock} data-for="0">
            <span className={styles.eyebrow}>A month of &ldquo;just this once&rdquo;</span>
            <h2 className={styles.heading}>It adds up quietly.</h2>
            <p className={styles.body}>Three white tees and a coat, one tap at a time. Watch the total.</p>
          </div>
          <div className={styles.copyBlock} data-for="1">
            <span className={styles.eyebrow}>A month of &ldquo;just this once&rdquo;</span>
            <h2 className={styles.heading}>It adds up quietly.</h2>
            <p className={styles.body}>Three white tees and a coat, one tap at a time. Watch the total.</p>
          </div>
          <div className={styles.copyBlock} data-for="2">
            <span className={styles.eyebrow}>Then, a pause</span>
            <h2 className={styles.heading}>Two of those were the same tee.</h2>
            <p className={styles.body}>
              PAUSE spots what you already own. The repeats drop off, and the money stays in your plan.
            </p>
          </div>
        </div>

        <figure className={styles.receiptWrap}>
          <span className={styles.slot} aria-hidden="true" />
          <div className={styles.receipt} aria-hidden="true">
            <p className={styles.shop}>CHECKOUT &middot; ORDER 0429</p>
            <p className={styles.date}>An example, not real data</p>
            <hr className={styles.rule} />
            {RECEIPT_LINES.map((line, index) => (
              <p
                key={line.name}
                className={styles.line}
                data-repeat={line.repeat || undefined}
                data-coat={index === RECEIPT_LINES.length - 1 || undefined}
              >
                <span>{line.name}</span>
                <span>{line.price.toFixed(2)}</span>
              </p>
            ))}
            <hr className={styles.rule} />
            <p className={`${styles.line} ${styles.total}`}>
              <span>TOTAL</span>
              <span className={styles.totalValue}>
                <span data-total="0">{money(totals.firstThree)}</span>
                <span data-total="1">{money(totals.all)}</span>
                <span data-total="2">{money(totals.afterPause)}</span>
              </span>
            </p>
            <p className={`${styles.line} ${styles.kept}`}>
              <span>KEPT IN YOUR PLAN</span>
              <span>{money(totals.kept)}</span>
            </p>
            <span className={styles.stamp}>PAUSED</span>
          </div>
          <figcaption className={styles.srOnly}>
            An example receipt with four items: a white crew tee $34, a white linen tee $29, an oversized white tee $40
            and a black wool coat $189. PAUSE flags the two extra tees as repeats. The total after a pause is{" "}
            {money(totals.afterPause)}, and {money(totals.kept)} stays in the plan.
          </figcaption>
        </figure>

        <div className={styles.cta}>
          <h2 className={styles.ctaHeading}>Pause the next one.</h2>
          <p className={styles.ctaBody}>{money(totals.kept)} kept in this example, just by waiting a day.</p>
          {cta}
        </div>
      </div>
    </section>
  );
}
