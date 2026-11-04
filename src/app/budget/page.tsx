import { computeSuggestedBudget, currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { formatMonthLabel } from "@/lib/monthLabel";
import { requireUserIdOrRedirect } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import {
  GOAL_NAME_MAX,
  getSavingsGoal,
  goalProgress,
  isGoalStorageAvailable,
} from "@/lib/goals/savingsGoal";
import { GoalSheet } from "../dashboard/GoalSheet";
import { GoalStatus } from "../dashboard/GoalStatus";
import { SettingCard } from "./SettingCard";
import styles from "./budget.module.css";

// "$250" for a whole amount, "$111.11" when there are cents.
function money(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

// Budget & goals: a monthly plan and a savings goal, each its own switch.
// Use one, both or neither; Home shows what is on. The goal card is left out
// entirely until the goals table exists, rather than showing a form that can
// only fail.
export default async function BudgetPage(props?: { searchParams?: Promise<{ open?: string }> }) {
  const open = (await props?.searchParams)?.open;
  const userId = await requireUserIdOrRedirect();
  const monthKey = currentMonthKey();

  const [budget, spend, goalAvailable] = await Promise.all([
    getBudgetForMonth(userId, monthKey),
    getMonthSpend(userId, monthKey),
    isGoalStorageAvailable(),
  ]);
  const [suggestion, goal] = await Promise.all([
    !budget ? computeSuggestedBudget(userId, monthKey) : Promise.resolve(null),
    goalAvailable ? getSavingsGoal(userId) : Promise.resolve(null),
  ]);

  const planAmount = budget ? Number(budget.amount) : null;
  const progress = goal ? goalProgress(goal.target, goal.saved) : null;

  return (
    <div className="page">
      <PageHeader
        back={{ href: "/account", label: "Settings" }}
        title="Budget & goals"
        subtitle="Use one, both or neither. Home shows what you turn on. PAUSE only counts money you choose not to spend; it never moves any."
      />

      <div className={styles.stack}>
        <div id="plan">
          <SettingCard
            title="Monthly plan"
            description="A spending amount for clothes each month. Home shows what is left."
            enabled={planAmount !== null}
            defaultOpen={open === "plan"}
            offAction="/api/budget"
            offFields={{ intent: "off", returnTo: "/budget" }}
            onContent={
              planAmount !== null && (
                <>
                  <div className={styles.valueMain}>
                    <p className={styles.valueLine}>{money(planAmount)} a month</p>
                    <p className={styles.valueNote}>
                      {planAmount - spend >= 0
                        ? `${money(planAmount - spend)} left in ${formatMonthLabel(monthKey)}`
                        : `${money(spend - planAmount)} over in ${formatMonthLabel(monthKey)}`}
                    </p>
                  </div>
                  <form action="/api/budget" method="POST" className={styles.form}>
                    <input type="hidden" name="returnTo" value="/budget" />
                    <label htmlFor="plan-amount">Change the plan</label>
                    <div className={styles.formRow}>
                      <input
                        id="plan-amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={planAmount}
                        required
                      />
                      <button type="submit">Save plan</button>
                    </div>
                  </form>
                </>
              )
            }
            offContent={
              <form action="/api/budget" method="POST" className={styles.form}>
                <input type="hidden" name="returnTo" value="/budget" />
                {suggestion !== null && (
                  <p className={styles.valueNote}>
                    Based on your past spending, about {money(suggestion)} might be reasonable. Just a suggestion; you
                    decide the number.
                  </p>
                )}
                <label htmlFor="plan-amount-new">Plan for {formatMonthLabel(monthKey)}</label>
                <div className={styles.formRow}>
                  <input
                    id="plan-amount-new"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="250"
                    defaultValue={suggestion ?? ""}
                    required
                  />
                  <button type="submit" className="btn-primary">
                    Turn on plan
                  </button>
                </div>
              </form>
            }
          />
        </div>

        {goalAvailable && (
          <div id="goal">
            <SettingCard
              title="Savings goal"
              description="Save toward something you would rather have. Every item you let go adds its price."
              enabled={goal !== null}
              defaultOpen={open === "goal"}
              offAction="/api/goal"
              offFields={{ intent: "remove", returnTo: "/budget" }}
              onContent={
                goal &&
                progress && (
                  <div className={styles.value}>
                    <div className={styles.valueMain}>
                      <p className={styles.valueLine}>
                        {goal.name} · {money(progress.saved)} of {money(goal.target)}
                      </p>
                      <ProgressBar
                        value={progress.saved}
                        max={goal.target}
                        label={`${goal.name}: ${money(progress.saved)} saved of ${money(goal.target)}`}
                        step={0}
                        tone="rose"
                      />
                    </div>
                    <GoalSheet
                      mode="save"
                      triggerLabel="Edit goal"
                      triggerClassName="btn"
                      initial={{ name: goal.name, target: goal.target }}
                      hasGoal
                      nameMax={GOAL_NAME_MAX}
                      returnTo="/budget"
                    />
                  </div>
                )
              }
              offContent={
                <form action="/api/goal" method="POST" className={styles.form}>
                  <input type="hidden" name="intent" value="save" />
                  <input type="hidden" name="returnTo" value="/budget" />
                  <label htmlFor="goal-name">What are you saving toward?</label>
                  <input
                    id="goal-name"
                    name="name"
                    type="text"
                    required
                    maxLength={GOAL_NAME_MAX}
                    autoComplete="off"
                    placeholder="e.g. Winter boots"
                  />
                  <label htmlFor="goal-amount">How much does it cost?</label>
                  <div className={styles.formRow}>
                    <input
                      id="goal-amount"
                      name="amount"
                      type="text"
                      inputMode="decimal"
                      required
                      autoComplete="off"
                      placeholder="$ 250"
                    />
                    <button type="submit" className="btn-primary">
                      Turn on goal
                    </button>
                  </div>
                </form>
              }
            />
          </div>
        )}
        <GoalStatus />
      </div>
    </div>
  );
}
