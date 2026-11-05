import { prisma } from "@/lib/prisma";
import { devWardrobeWhere } from "@/lib/devWardrobeView";
import { formatMonthLabel } from "@/lib/monthLabel";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TIMEZONE_COOKIE } from "@/lib/timezone";
import { TimezoneCookie } from "./TimezoneCookie";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { getKeptSummary } from "@/lib/dashboard/kept";
import { quoteForDay } from "@/lib/dashboard/dailyQuote";
import { sweepEndedPauses } from "@/lib/considering/consideringMeta";
import { recentHangingEntries, toWardrobeEntry } from "@/lib/wardrobeEntries";
import { QuoteBand } from "@/components/kit/QuoteBand";
import { ProgressBar } from "@/components/ProgressBar";
import { WarnIcon } from "@/components/WarnIcon";
import { LocalGreeting } from "./LocalGreeting";
import { PauseConfirmation } from "@/components/PauseConfirmation";
import { RackSlice } from "./RackSlice";
import { AddItem } from "@/components/AddItem";
import { ActionToast } from "@/components/ActionToast";
import { isDemoEmail } from "@/lib/demo";
import { getSetupProgress, nextStep, setupSteps } from "@/lib/dashboard/setupGuide";
import { SetupGuide } from "./SetupGuide";
import { CollapsibleGuide } from "./CollapsibleGuide";
import { loadMonthlyRecap } from "@/lib/dashboard/monthlyRecap";
import { GOAL_NAME_MAX, getSavingsGoal, isGoalStorageAvailable } from "@/lib/goals/savingsGoal";
import { MonthlyRecap } from "./MonthlyRecap";
import { GoalCard } from "./GoalCard";
import { GoalSheet } from "./GoalSheet";
import { EDIT_BUTTON_CLASS, MoneyCard } from "./MoneyCard";
import { MoneyChoice } from "./MoneyChoice";
import styles from "./page.module.css";
import { BudgetSheet } from "./BudgetSheet";

const RACK_SLICE_ITEMS = 4;

function dollars(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  const firstName = session.user?.name?.trim().split(/\s+/)[0] ?? null;

  // Pauses end silently: anything whose wait has passed quietly becomes Saved
  // for later. Nothing on Home announces it.
  await sweepEndedPauses(userId);

  const monthKey = currentMonthKey();
  const timeZone = (await cookies()).get(TIMEZONE_COOKIE)?.value;

  const [budget, spend, needsReviewCount, kept, wardrobeRows, pausedCount, setupProgress, recap, goal, goalAvailable] =
    await Promise.all([
    getBudgetForMonth(userId, monthKey),
    getMonthSpend(userId, monthKey),
    prisma.purchase.count({ where: { userId, status: "needs_review" } }),
    getKeptSummary(userId, "this_month"),
    // Same "in the wardrobe" rule as the Wardrobe page: everything except returned.
    prisma.wardrobeItem.findMany({
      where: { userId, status: { not: "returned" }, ...devWardrobeWhere() },
      include: { sourcePurchase: { select: { merchant: true, price: true } } },
    }),
    prisma.desiredItem.count({ where: { userId, pauseStatus: "waiting" } }),
    getSetupProgress(userId),
    loadMonthlyRecap(userId, new Date(), {
      allMonth: isDemoEmail(session.user?.email),
      timeZone: timeZone ?? null,
    }),
    getSavingsGoal(userId),
    isGoalStorageAvailable(),
  ]);

  const planAmount = budget ? Number(budget.amount) : null;
  const remaining = planAmount === null ? null : planAmount - spend;
  const isOver = remaining !== null && remaining < 0;

  const pieceCount = wardrobeRows.length;
  const rackItems = recentHangingEntries(wardrobeRows.map(toWardrobeEntry), RACK_SLICE_ITEMS);
  const quote = quoteForDay();

  const steps = setupSteps(setupProgress);
  const showGuide = nextStep(steps) !== null;
  // Plan and goal are each optional. Whichever is on leads; the other is one
  // quiet line, never a second filled button. With neither, ask which would help.
  const hasPlan = planAmount !== null;
  const hasGoal = goal !== null;
  const showGoalCard = goalAvailable && hasGoal;
  const showMoneyChoice = !hasPlan && !hasGoal;

  return (
    <div className={`page ${styles.home}`}>
      <TimezoneCookie />
      <LocalGreeting firstName={firstName} />
      <PauseConfirmation />
      <ActionToast />

      {showGuide && (
        <CollapsibleGuide>
          <SetupGuide steps={steps} isDemo={isDemoEmail(session.user?.email)} />
        </CollapsibleGuide>
      )}

      {recap && <MonthlyRecap recap={recap} />}

      <AddItem searchAvailable={Boolean(process.env.BRAVE_SEARCH_API_KEY)} primary={!showGuide} />

      {needsReviewCount > 0 && (
        <div className={styles.statusLines}>
          <a href="/purchases" className={styles.statusLine}>
            {needsReviewCount} receipt{needsReviewCount === 1 ? "" : "s"} need a quick look &rarr;
          </a>
        </div>
      )}

      {/* Money: the plan and the goal side by side, each optional. With
          neither, one question takes the row. */}
      {showMoneyChoice ? (
        <MoneyChoice goalAvailable={goalAvailable} />
      ) : (
        <div className={styles.money}>
          {planAmount === null || remaining === null ? (
            <section className={styles.card} aria-labelledby="month-heading">
              <h2 id="month-heading" className={styles.cardTitle}>
                This month
              </h2>
              <p className={styles.cardText}>
                No plan set for {formatMonthLabel(monthKey)}. Want a monthly limit?{" "}
                <a href="/budget?open=plan" className="link">
                  Set a plan
                </a>
              </p>
            </section>
          ) : (
            <MoneyCard
              eyebrow="Monthly plan"
              title="This month"
              titleId="month-heading"
              action={
                <BudgetSheet
                  amount={planAmount}
                  monthLabel={formatMonthLabel(monthKey)}
                  triggerClassName={EDIT_BUTTON_CLASS}
                  returnTo="/dashboard"
                />
              }
              bar={
                <ProgressBar
                  value={spend}
                  max={planAmount}
                  label={`${dollars(spend)} spent of ${dollars(planAmount)}`}
                  step={0}
                />
              }
              left={`${dollars(spend)} spent`}
              right={
                isOver ? (
                  <>
                    <WarnIcon /> {dollars(Math.abs(remaining))} over
                  </>
                ) : (
                  `${dollars(remaining)} left`
                )
              }
              rightWarn={isOver}
              note={`of your ${dollars(planAmount)} plan for ${formatMonthLabel(monthKey)}`}
            />
          )}

          {showGoalCard ? (
            <GoalCard goal={goal} />
          ) : (
            goalAvailable && (
              <section className={styles.card} aria-labelledby="goal-offer-heading">
                <h2 id="goal-offer-heading" className={styles.cardTitle}>
                  Saving for something?
                </h2>
                <p className={styles.cardText}>
                  Every item you let go adds its price to a goal, like a trip or one piece you really want.
                </p>
                <GoalSheet
                  mode="save"
                  triggerLabel="Set a savings goal"
                  triggerClassName="btn"
                  hasGoal={false}
                  nameMax={GOAL_NAME_MAX}
                  savedThisMonth={kept.totalKept}
                />
              </section>
            )
          )}
        </div>
      )}

      {/* Everything else at a glance: three labelled figures in one card, each
          a link. Paused counts items still waiting; it never names them
          (pauses end silently). */}
      <ul className={styles.glance} aria-label="At a glance">
        <li>
          <a href="/considering?tab=let-go">
            <strong>{dollars(kept.totalKept)}</strong>
            <span>saved by letting things go</span>
          </a>
        </li>
        <li>
          <a href="/considering">
            <strong>{pausedCount}</strong>
            <span>on pause</span>
          </a>
        </li>
        <li>
          <a href="/wardrobe">
            <strong>{pieceCount}</strong>
            <span>{pieceCount === 1 ? "piece" : "pieces"} in your closet</span>
          </a>
        </li>
      </ul>

      <section className={styles.card} aria-labelledby="closet-heading">
        <div className={styles.cardHead}>
          <h2 id="closet-heading" className={styles.cardTitle}>
            Recently added
          </h2>
          {pieceCount > 0 && (
            <a href="/wardrobe?view=rack" className={styles.quietLink}>
              See your closet &rarr;
            </a>
          )}
        </div>
        {rackItems.length > 0 && <RackSlice items={rackItems} />}
        {pieceCount === 0 && (
          <a href="/wardrobe#add-to-wardrobe" className={styles.quietLink}>
            Add your first piece &rarr;
          </a>
        )}
      </section>

      <QuoteBand text={quote.text} source={quote.source} />
    </div>
  );
}
