"use client";

import { useId, useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import styles from "./budget.module.css";

// The plan's value row, built like the goal's: a line and a bar on the left,
// one outlined button on the right. "Edit budget" opens the amount form under
// the row (the goal's button opens its own sheet), so both settings read the
// same way and the buttons sit in the same place.
export function PlanValue({
  amount,
  spend,
  monthLabel,
}: {
  amount: number;
  spend: number;
  monthLabel: string;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
  const left = amount - spend;

  return (
    <>
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
        <button
          type="button"
          className="btn"
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => setOpen((value) => !value)}
        >
          Edit budget
        </button>
      </div>
      <form id={formId} action="/api/budget" method="POST" className={styles.form} hidden={!open}>
        <input type="hidden" name="returnTo" value="/budget" />
        <label htmlFor="plan-amount">Monthly plan</label>
        <div className={styles.formRow}>
          <span className="money-field">
            <span aria-hidden="true">$</span>
            <input id="plan-amount" name="amount" type="number" step="0.01" min="0" defaultValue={amount} required />
          </span>
          <button type="submit" className="btn-primary">
            Save plan
          </button>
        </div>
      </form>
    </>
  );
}
