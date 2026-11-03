import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { getSavingsGoal, goalProgress } from "@/lib/goals/savingsGoal";
import { getClosestOwned } from "@/lib/considering/keptPairs";
import { ItemArt } from "@/components/ItemArt";
import styles from "./letGo.module.css";

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

function dollars(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

// The moment after "Let it go": one calm screen instead of a toast, because
// this is the decision PAUSE exists for. It says what stayed in the plan, what
// you already own, and how far a savings goal moved. No confetti, no sound:
// the only motion is the check, the money settling back, and the goal bar
// growing by exactly what was added (all off under reduced motion).
export default async function LetGoPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserIdOrRedirect();
  const { id } = await params;

  const item = await prisma.desiredItem.findFirst({ where: { id, userId } });
  if (!item) notFound();
  // Only a let-go item gets this screen; anything else goes to its own page.
  if (item.decisionOutcome !== "dropped") redirect(`/desired-items/${id}`);

  const price = item.price ? Number(item.price) : null;
  const monthKey = currentMonthKey();
  const [budget, spend, owned, goal] = await Promise.all([
    getBudgetForMonth(userId, monthKey),
    getMonthSpend(userId, monthKey),
    getClosestOwned(userId, item),
    getSavingsGoal(userId),
  ]);

  const planAmount = budget ? Number(budget.amount) : null;
  const headline =
    price === null ? "You let it go" : planAmount !== null ? `${dollars(price)} stays in your plan` : `You kept ${dollars(price)}`;

  // Plan bar: what is spent, plus a "would have been" segment that settles away.
  let plan: null | { spendLabel: string; wouldLine: string; spentPct: number; ghostPct: number; over: number } = null;
  if (planAmount !== null) {
    const wouldBe = price === null ? spend : spend + price;
    const scale = Math.max(planAmount, wouldBe, 1);
    const over = Math.max(0, wouldBe - planAmount);
    plan = {
      spendLabel: `${dollars(spend)} of ${dollars(planAmount)}`,
      wouldLine:
        price === null
          ? ""
          : over > 0
            ? `Would have been ${dollars(wouldBe)}, ${dollars(over)} over your plan`
            : `Would have taken you to ${dollars(wouldBe)} of ${dollars(planAmount)}`,
      spentPct: (spend / scale) * 100,
      ghostPct: price === null ? 0 : (price / scale) * 100,
      over,
    };
  }

  const progress = goal ? goalProgress(goal.target, goal.saved) : null;
  // Where the goal bar started before this item was added, as a share of where it ends.
  const goalFrom = goal && price !== null && goal.saved > 0 ? Math.max(0, (goal.saved - price) / goal.saved) : 0;

  let step = 0;
  const reveal = () => ({ "--i": step++ }) as CSSProperties;

  return (
    <div className={`page ${styles.wrap}`}>
      <div className={styles.check} style={reveal()} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path className={styles.checkPath} d="M5.5 12.5l4.2 4.2 8.8-9.4" />
        </svg>
      </div>

      <header className={styles.head} style={reveal()}>
        <p className="page__eyebrow">You let it go</p>
        <h1 className={styles.title}>{headline}</h1>
        <p className={styles.sub}>
          {item.itemName || "This item"}
          {item.brand ? `, ${item.brand}` : ""}
        </p>
      </header>

      {plan && (
        <section className={`${styles.card} ${styles.plan}`} style={reveal()} aria-label="Your plan this month">
          <div className={styles.rowBetween}>
            <span className={styles.strong}>This month</span>
            <span className={styles.strong}>{plan.spendLabel}</span>
          </div>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label="Spent this month"
            aria-valuemin={0}
            aria-valuemax={Math.round(planAmount ?? 0)}
            aria-valuenow={Math.round(spend)}
          >
            <span className={styles.spent} style={{ width: `${plan.spentPct}%` }} />
            <span className={styles.ghost} style={{ left: `${plan.spentPct}%`, width: `${plan.ghostPct}%` }} />
          </div>
          {plan.wouldLine && (
            <p className={styles.would}>
              <span className={styles.swatch} aria-hidden="true" />
              {plan.wouldLine}
            </p>
          )}
        </section>
      )}

      {owned && (
        <section className={`${styles.card} ${styles.kept}`} style={reveal()} aria-label="What you already own">
          <div className={styles.keptArt}>
            <ItemArt item={owned} />
          </div>
          <div>
            <p className={styles.keptLabel}>You already have</p>
            <p className={styles.keptName}>{owned.itemName}</p>
            {owned.ownedSince && <p className={styles.keptMeta}>In your closet since {MONTH_YEAR.format(owned.ownedSince)}</p>}
          </div>
        </section>
      )}

      {goal && progress && price !== null && (
        <section className={styles.goal} style={reveal()} aria-label="Savings goal">
          <div className={styles.rowBetween}>
            <span className={styles.strong}>{goal.name}</span>
            <span className={styles.strong}>
              {dollars(progress.saved)} of {dollars(goal.target)}
            </span>
          </div>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label={`Saved toward ${goal.name}`}
            aria-valuemin={0}
            aria-valuemax={Math.round(goal.target)}
            aria-valuenow={Math.round(progress.saved)}
          >
            <span
              className={styles.goalFill}
              style={{ width: `${progress.fraction * 100}%`, "--from": goalFrom } as CSSProperties}
            />
          </div>
          <p className={styles.would}>
            {progress.reached ? `You reached ${goal.name}.` : `+${dollars(price)} toward it. ${dollars(progress.remaining)} to go.`}
          </p>
        </section>
      )}

      <div className={styles.actions} style={reveal()}>
        <Link href="/dashboard" className="btn-primary action">
          Back to Home
        </Link>
        <Link href="/considering?tab=let-go" className="btn-quiet">
          See what you&apos;ve let go
        </Link>
      </div>
    </div>
  );
}
