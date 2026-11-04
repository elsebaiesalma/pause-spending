"use client";

import { BudgetSheet } from "@/app/dashboard/BudgetSheet";
import { ProgressBar } from "@/components/ProgressBar";
import styles from "./budget.module.css";

// The plan's value row, built like the goal's: a line and a bar on the left,
// one outlined button on the right. "Edit budget" opens the same dialog as
// "Edit goal" and as Home's plan card.
export function PlanValue({
  amount,
  spend,
  monthLabel,
}: {
  amount: number;
  spend: number;
  monthLabel: string;
}) {
  const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
  const left = amount - spend;

  return (
    <div className={styles.value}>
      <div className={styles.valueMain}>
        <p className={styles.valueLine}>
          {money(amount)} a month &middot;{" "}
          {left >= 0 ? `${money(left)} left in ${monthLabel}` : `${money(-left)} over in ${monthLabel}`}
        </p>
        <ProgressBar
          value={spend}
          max={amount}
          label={`${money(spend)} spent of ${money(amount)} in ${monthLabel}`}
          step={0}
        />
      </div>
      <BudgetSheet amount={amount} monthLabel={monthLabel} triggerClassName="btn" returnTo="/budget" />
    </div>
  );
}
