import styles from "./HeroPreview.module.css";

// A static picture of the real pause screen for the landing hero, built from
// the app's own parts (garment silhouettes, the budget bar) so it needs no
// screenshot file; the two coats are the sample closet's own photos. The numbers are an
// example (spoken in the description, not shown as a badge). It is decorative, so assistive tech gets one
// description instead of reading the fake buttons.
const SPENT = 175;
const PLAN = 250;
const PRICE = 259;
const OVER = SPENT + PRICE - PLAN;

export function HeroPreview() {
  const spentShare = (SPENT / (SPENT + PRICE)) * 100;
  const overShare = (OVER / (SPENT + PRICE)) * 100;

  return (
    <figure
      className={styles.card}
      role="img"
      aria-label={`Example of a PAUSE screen: an oversized pinstripe grey coat for $${PRICE} next to the grey wool coat you already own, and what buying them does to a $${PLAN} monthly plan.`}
    >
      <div aria-hidden="true">
        <div className={styles.top}>
          <span className={styles.label}>Before you buy</span>
        </div>

        <div className={styles.pair}>
          <div className={styles.piece}>
            <div className={styles.art}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mock/coat-pinstripe-grey.jpg" alt="" width={800} height={1000} />
            </div>
            <p className={styles.kicker}>You want</p>
            <p className={styles.name}>Oversized Pinstripe Long Coat</p>
            <p className={styles.meta}>${PRICE}</p>
          </div>
          <div className={styles.piece}>
            <div className={styles.art}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mock/coat-grey-wool.jpg" alt="" width={800} height={1000} />
            </div>
            <p className={styles.kicker}>You own</p>
            <p className={styles.name}>Oversized Wool Coat</p>
            <p className={styles.meta}>Bought Dec 2025</p>
          </div>
        </div>

        <p className={styles.reason}>same color · same category</p>

        <div className={styles.budget}>
          <div className={styles.bar}>
            <span className={styles.barSpent} style={{ width: `${spentShare}%` }} />
            <span className={styles.barOver} style={{ width: `${overShare}%` }} />
          </div>
          <p className={styles.budgetLine}>
            ${SPENT} of ${PLAN} spent this month
          </p>
          <p className={styles.overLine}>
            <span className={styles.overIcon}>!</span>
            Buying this puts you ${OVER} over your plan
          </p>
        </div>

        <div className={styles.actions}>
          <span className={styles.primary}>Pause for 24 hours</span>
          <span className={styles.secondary}>Let it go</span>
        </div>
      </div>
    </figure>
  );
}
