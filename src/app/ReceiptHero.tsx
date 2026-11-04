"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { RECEIPT_LINES, money, receiptTotals } from "@/lib/landing/receipt";
import styles from "./receiptHero.module.css";

// Scroll positions (0 to 1 through the scene) at which each step happens:
// the four lines print, the repeats are struck and PAUSED lands, then the
// total drops and "kept" appears.
const STEP_AT = [0.08, 0.2, 0.32, 0.44, 0.6, 0.78] as const;
// The paper is fed out of the slot over the first 40% of the scene.
const FEED_UNTIL = 0.4;

// The opening of the landing page: the headline and call to action on the
// left, and a receipt on the right that prints as you scroll. The page holds
// still (a sticky stage) while the four lines print, the two repeat tees are
// struck through, a PAUSED stamp lands, and the total drops to what is left.
//
// The finished receipt is the default: with reduced motion, with no script, on
// a short screen and before hydration the hero is a normal section showing that
// state. Only when motion is allowed does the script make it a tall scene and
// drive it from the scroll position, by editing CSS variables on the element
// (not React state), so scrolling never re-renders.
export function ReceiptHero({ actions, note }: { actions: ReactNode; note?: ReactNode }) {
  const totals = receiptTotals();
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const canPlay = () =>
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches && window.innerHeight >= 600;
    if (!canPlay()) return;

    root.dataset.live = "true";
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!canPlay()) {
        delete root.dataset.live;
        root.style.removeProperty("--step");
        root.style.removeProperty("--feed");
        return;
      }
      root.dataset.live = "true";
      const rect = root.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      const span = rect.height - stage.offsetHeight;
      const progress = span > 0 ? Math.min(1, Math.max(0, (stickyTop - rect.top) / span)) : 1;
      const step = STEP_AT.filter((at) => progress >= at).length;
      root.style.setProperty("--feed", Math.min(1, progress / FEED_UNTIL).toFixed(3));
      if (root.style.getPropertyValue("--step") !== String(step)) root.style.setProperty("--step", String(step));
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
      root.style.removeProperty("--step");
      root.style.removeProperty("--feed");
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.hero} aria-labelledby="hero-heading">
      <div ref={stageRef} className={styles.stage}>
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

        <figure className={styles.receiptWrap}>
          <span className={styles.slot} aria-hidden="true" />
          <div className={styles.feed}>
          <div className={styles.receipt} aria-hidden="true">
            <p className={styles.shop}>CHECKOUT &middot; ORDER 0429</p>
            <p className={styles.date}>An example, not real data</p>
            <hr className={styles.rule} />
            {RECEIPT_LINES.map((line, index) => (
              <p
                key={line.name}
                className={styles.line}
                data-repeat={line.repeat || undefined}
                style={{ "--i": index } as CSSProperties}
              >
                <span>{line.name}</span>
                <span className={styles.amount}>{line.price.toFixed(2)}</span>
              </p>
            ))}
            <hr className={styles.rule} />
            <p className={`${styles.line} ${styles.total}`}>
              <span>TOTAL</span>
              <span className={`${styles.amount} ${styles.totalValue}`}>
                <span className={styles.totalBefore}>{money(totals.all)}</span>
                <span className={styles.totalAfter}>{money(totals.afterPause)}</span>
              </span>
            </p>
            <p className={`${styles.line} ${styles.kept}`}>
              <span>KEPT IN YOUR PLAN</span>
              <span className={styles.amount}>{money(totals.kept)}</span>
            </p>
            <span className={styles.stamp}>PAUSED</span>
          </div>
          </div>
          <figcaption className={styles.srOnly}>
            An example receipt: a white crew tee $34, a white linen tee $29, an oversized white tee $40 and a black
            wool coat $189, {money(totals.all)} in all. PAUSE flags the two extra tees as repeats, so the total after a
            pause is {money(totals.afterPause)} and {money(totals.kept)} stays in the plan.
          </figcaption>
        </figure>
      </div>
      <span className={styles.hint} aria-hidden="true">
        Scroll to print the receipt
      </span>
      </div>
    </section>
  );
}
