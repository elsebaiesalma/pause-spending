"use client";

import { useId, useState } from "react";
import styles from "./budget.module.css";

// Settings' goal row: "Edit goal" opens the name and cost fields inline under
// the row, the same pattern as the plan. The pop-up dialog is Home's only.
export function GoalEdit({
  name,
  target,
  nameMax,
  progress,
}: {
  name: string;
  target: number;
  nameMax: number;
  progress: React.ReactNode;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.value}>
        {progress}
        <button
          type="button"
          className="btn"
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => setOpen((value) => !value)}
        >
          Edit goal
        </button>
      </div>
      <form id={formId} action="/api/goal" method="POST" className={styles.form} hidden={!open}>
        <input type="hidden" name="intent" value="save" />
        <input type="hidden" name="returnTo" value="/budget" />
        <label htmlFor="goal-edit-name">What are you saving toward?</label>
        <input
          id="goal-edit-name"
          name="name"
          type="text"
          required
          maxLength={nameMax}
          autoComplete="off"
          defaultValue={name}
        />
        <label htmlFor="goal-edit-amount">How much does it cost?</label>
        <div className={styles.formRow}>
          <span className="money-field">
            <span aria-hidden="true">$</span>
            <input id="goal-edit-amount" name="amount" type="text" inputMode="decimal" required autoComplete="off" defaultValue={String(target)} />
          </span>
          <button type="submit" className="btn-primary">
            Save goal
          </button>
          <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
