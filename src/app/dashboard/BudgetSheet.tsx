"use client";

import { useRef } from "react";
import styles from "./GoalCard.module.css";

// The form behind "Edit budget": the same centred dialog (a bottom sheet on
// phones) as "Edit goal", so the same kind of action opens the same kind of
// thing, on Home and in Settings. A native <dialog>, so focus is trapped and
// Esc closes it; it posts to /api/budget like a plain form.
export function BudgetSheet({
  amount,
  monthLabel,
  triggerClassName,
  returnTo,
}: {
  amount: number;
  monthLabel: string;
  triggerClassName: string;
  returnTo: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => dialogRef.current?.showModal()}>
        Edit budget
      </button>
      <dialog ref={dialogRef} className={styles.sheet} aria-labelledby="budget-sheet-title">
        <form method="post" action="/api/budget" className={styles.sheetForm}>
          <h2 id="budget-sheet-title" className={styles.sheetTitle}>
            Edit your monthly plan
          </h2>
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className={styles.field}>
            <span>How much do you plan to spend in {monthLabel}?</span>
            <span className="money-field">
              <span aria-hidden="true">$</span>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                required
                defaultValue={String(amount)}
                autoComplete="off"
              />
            </span>
            <small>It only counts what you spend. PAUSE never moves money.</small>
          </label>

          <div className={styles.sheetActions}>
            <button type="submit" className="btn-primary">
              Save plan
            </button>
            <button type="button" className="btn-quiet" onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
