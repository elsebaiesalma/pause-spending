import type { CSSProperties, ReactNode } from "react";
import { RECEIPT_LINES, money, receiptTotals } from "@/lib/landing/receipt";
import styles from "./receiptHero.module.css";

// The opening of the landing page: the headline and call to action on the
// left, and a receipt on the right that prints once on load. The two repeat
// tees get struck through, a PAUSED stamp lands, and the total drops to what
// is left once the repeats are gone.
//
// No JavaScript and no scroll-driven state: it is all CSS animation that only
// runs with prefers-reduced-motion: no-preference. Every element's resting
// state is the finished receipt, so reduced motion, no CSS animation support
// and screenshots all show the end of the story.
export function ReceiptHero({ actions, note }: { actions: ReactNode; note?: ReactNode }) {
  const totals = receiptTotals();

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
    </section>
  );
}
