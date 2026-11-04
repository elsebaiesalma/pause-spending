"use client";

import { useRef, type ReactNode } from "react";
import { useQueryParam } from "@/lib/dashboard/useQueryParam";
import styles from "./GoalCard.module.css";

export type GoalSheetMode = "save" | "restart";

// The form behind "Set savings goal", "Edit" and "Set next goal". A native
// <dialog>: focus is trapped, Esc closes it and the page behind is inert, all
// without extra code. It posts to /api/goal like a plain form, so it works
// before any script has run on the next page.
export function GoalSheet({
  mode,
  triggerLabel,
  triggerClassName,
  triggerContent,
  initial,
  hasGoal,
  nameMax,
  returnTo = "/dashboard",
  savedThisMonth = 0,
}: {
  mode: GoalSheetMode;
  triggerLabel: string;
  triggerClassName: string;
  // Replaces the plain label, for a trigger that is a card.
  triggerContent?: ReactNode;
  // Prefilled when editing.
  initial?: { name: string; target: number };
  // False in the empty state: with no table to save into there is nothing to open.
  hasGoal: boolean;
  // Passed in rather than imported: the goals module reads the database and
  // must stay out of the client bundle.
  nameMax: number;
  // Where the form sends the person back to: Home, or Settings.
  returnTo?: string;
  // Let-go money already counted this month; a new goal can include it.
  savedThisMonth?: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const status = useQueryParam("goal");
  const title = mode === "restart" ? "Set your next goal" : initial ? "Edit your goal" : "Set a savings goal";

  if (!hasGoal && status === "unavailable") return null;

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => dialogRef.current?.showModal()}>
        {triggerContent ?? triggerLabel}
      </button>
      <dialog ref={dialogRef} className={styles.sheet} aria-labelledby={`goal-sheet-${mode}`}>
        <form method="post" action="/api/goal" className={styles.sheetForm}>
          <h2 id={`goal-sheet-${mode}`} className={styles.sheetTitle}>
            {title}
          </h2>
          <input type="hidden" name="intent" value={mode} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className={styles.field}>
            <span>What are you saving toward?</span>
            <input
              name="name"
              type="text"
              required
              maxLength={nameMax}
              defaultValue={initial?.name ?? ""}
              autoComplete="off"
              placeholder="e.g. Winter boots"
            />
          </label>

          <label className={styles.field}>
            <span>How much does it cost?</span>
            <span className="money-field">
              <span aria-hidden="true">$</span>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                required
                defaultValue={initial ? String(initial.target) : ""}
                autoComplete="off"
              />
            </span>
            <small>Counts money you chose not to spend. PAUSE doesn&rsquo;t move money.</small>
          </label>

          <GoalStartChoice isNew={!initial && mode === "save"} savedThisMonth={savedThisMonth} />

          <div className={styles.sheetActions}>
            <button type="submit" className="btn-primary">
              Save goal
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

// For a new goal: whether it starts from today or also counts what was let go
// earlier this month. Without this, Home says "$189 saved" while a brand-new
// goal says "$0 saved", with nothing explaining why.
export function GoalStartChoice({ isNew, savedThisMonth }: { isNew: boolean; savedThisMonth: number }) {
  if (!isNew) return null;
  if (savedThisMonth <= 0) {
    return <p className={styles.startNote}>Counts what you let go from today.</p>;
  }
  const amount = Number.isInteger(savedThisMonth) ? `$${savedThisMonth}` : `$${savedThisMonth.toFixed(2)}`;
  return (
    <label className={styles.startChoice}>
      <input type="checkbox" name="countFrom" value="month" defaultChecked />
      <span>Include the {amount} you&rsquo;ve already saved this month</span>
    </label>
  );
}
