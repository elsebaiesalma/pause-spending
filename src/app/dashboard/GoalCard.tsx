import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { GOAL_NAME_MAX, goalProgress, type SavingsGoal } from "@/lib/goals/savingsGoal";
import { GoalSheet } from "./GoalSheet";
import { GoalStatus } from "./GoalStatus";
import styles from "./GoalCard.module.css";

function dollars(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

function shortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// One savings goal, in four states: none, in progress, reached (and, behind a
// button, the sheet to set or change it). The card only ever counts money the
// person chose not to spend; it never moves any.
export function GoalCard({ goal }: { goal: SavingsGoal | null }) {
  if (!goal) {
    return (
      <section className={styles.card} aria-label="Savings goal">
        <EmptyState
          title="Give your savings somewhere to go"
          action={
            <GoalSheet
              mode="save"
              triggerLabel="Set savings goal"
              triggerClassName="btn-primary"
              hasGoal={false}
              nameMax={GOAL_NAME_MAX}
            />
          }
        >
          Name something you&rsquo;d rather have. Every time you let something go, it fills up.
        </EmptyState>
        <GoalStatus />
      </section>
    );
  }

  const progress = goalProgress(goal.target, goal.saved);

  if (progress.reached) {
    return (
      <section className={`${styles.card} ${styles.reached}`} aria-label="Savings goal">
        <h2 className={styles.reachedTitle}>You reached {goal.name}</h2>
        <p className={styles.reachedText}>{dollars(goal.target)} you chose not to spend. Enjoy it.</p>
        <div className={styles.reachedActions}>
          <GoalSheet
            mode="restart"
            triggerLabel="Set next goal"
            triggerClassName={styles.lightButton}
            hasGoal
            nameMax={GOAL_NAME_MAX}
          />
          <form method="post" action="/api/goal">
            <input type="hidden" name="intent" value="remove" />
            <input type="hidden" name="returnTo" value="/dashboard" />
            <button type="submit" className={styles.quietOnDark}>
              Remove goal
            </button>
          </form>
        </div>
        <GoalStatus />
      </section>
    );
  }

  return (
    <section className={styles.card} aria-labelledby="goal-heading">
      <p className={styles.eyebrow}>Saving toward</p>
      <h2 id="goal-heading" className={styles.goalName}>
        {goal.name}
      </h2>
      <ProgressBar
        value={progress.saved}
        max={goal.target}
        label={`${goal.name}: ${dollars(progress.saved)} saved of ${dollars(goal.target)}`}
        step={0}
        tone="rose"
      />
      <p className={styles.figures}>
        <strong>{dollars(progress.saved)} saved</strong>
        <span>{dollars(progress.remaining)} to go</span>
      </p>
      {goal.lastAdded && (
        <p className={styles.last}>
          Last added: {dollars(goal.lastAdded.amount)}
          {goal.lastAdded.itemName ? ` from ${goal.lastAdded.itemName}` : ""}, {shortDate(goal.lastAdded.at)}
        </p>
      )}
      <div className={styles.editRow}>
        <GoalSheet
          mode="save"
          triggerLabel="Edit"
          triggerClassName="btn-quiet"
          initial={{ name: goal.name, target: goal.target }}
          hasGoal
          nameMax={GOAL_NAME_MAX}
        />
      </div>
      <GoalStatus />
    </section>
  );
}
