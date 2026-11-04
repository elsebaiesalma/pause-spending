import { WarnIcon } from "@/components/WarnIcon";
import styles from "./page.module.css";

const money = (n: number) => `$${n.toFixed(0)}`;

// Three plain rows and one bar. The bar's full width is the larger of the plan
// and the total after buying, so going over the plan shows as a bar that has
// outgrown its marker rather than a clipped one.
export function ImpactRows({
  budget,
  spent,
  item,
  after,
}: {
  budget: number;
  spent: number;
  item: number;
  after: number;
}) {
  const over = after - budget;
  const scale = Math.max(budget, after) || 1;
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;

  return (
    <div className={styles.impact}>
      <dl className={styles.impactRows}>
        <div>
          <dt>Spent so far this month</dt>
          <dd>{money(spent)}</dd>
        </div>
        <div>
          <dt>This item</dt>
          <dd>+ {money(item)}</dd>
        </div>
        <div className={styles.impactTotal}>
          <dt>If you buy it</dt>
          <dd>
            {money(after)} <span>of {money(budget)}</span>
          </dd>
        </div>
      </dl>

      <div
        className={styles.impactBar}
        role="img"
        aria-label={`${money(spent)} already spent, plus ${money(item)} for this item, of a ${money(budget)} plan`}
      >
        <span className={styles.impactSpent} style={{ width: pct(spent) }} />
        <span className={styles.impactItem} style={{ left: pct(spent), width: pct(item) }} />
        {over > 0 && <span className={styles.impactMarker} style={{ left: pct(budget) }} />}
      </div>
      <p className={styles.impactKey}>
        <span data-key="spent">Spent</span>
        <span data-key="item">This item</span>
      </p>

      {over > 0 && (
        <p className={styles.overPlan}>
          <WarnIcon />
          {money(over)} over your plan
        </p>
      )}
    </div>
  );
}
