import { prisma } from "@/lib/prisma";
import { devWardrobeWhere } from "@/lib/devWardrobeView";
import { formatMonthLabel } from "@/lib/monthLabel";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { getKeptSummary } from "@/lib/dashboard/kept";
import { quoteForDay } from "@/lib/dashboard/dailyQuote";
import { sweepEndedPauses } from "@/lib/considering/consideringMeta";
import { recentHangingEntries, toWardrobeEntry } from "@/lib/wardrobeEntries";
import { QuoteBand } from "@/components/kit/QuoteBand";
import { ReceiptBlock } from "@/components/kit/ReceiptBlock";
import { LocalGreeting } from "./LocalGreeting";
import { PauseConfirmation } from "@/components/PauseConfirmation";
import { RackSlice } from "./RackSlice";
import { SmartAdd } from "./SmartAdd";
import { isDemoEmail } from "@/lib/demo";
import { getSetupProgress, nextStep, setupSteps } from "@/lib/dashboard/setupGuide";
import { SetupGuide } from "./SetupGuide";
import styles from "./page.module.css";

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

  const [budget, spend, needsReviewCount, kept, wardrobeRows, pausedCount, setupProgress] = await Promise.all([
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
  ]);

  const planAmount = budget ? Number(budget.amount) : null;
  const remaining = planAmount === null ? null : planAmount - spend;
  const isOver = remaining !== null && remaining < 0;

  const pieceCount = wardrobeRows.length;
  const rackItems = recentHangingEntries(wardrobeRows.map(toWardrobeEntry), RACK_SLICE_ITEMS);
  const quote = quoteForDay();

  const steps = setupSteps(setupProgress);
  const showGuide = nextStep(steps) !== null;
  const spentShare = planAmount ? Math.min(100, (spend / planAmount) * 100) : 0;

  return (
    <div className={`page ${styles.home}`}>
      <LocalGreeting firstName={firstName} />
      <PauseConfirmation />

      {showGuide && <SetupGuide steps={steps} isDemo={isDemoEmail(session.user?.email)} />}

      <SmartAdd searchAvailable={Boolean(process.env.BRAVE_SEARCH_API_KEY)} primary={!showGuide} />

      {needsReviewCount > 0 && (
        <div className={styles.statusLines}>
          <a href="/purchases" className={styles.statusLine}>
            {needsReviewCount} receipt{needsReviewCount === 1 ? "" : "s"} need a quick look &rarr;
          </a>
        </div>
      )}

      {/* The month at a glance, on the espresso band. Paused counts items
          still waiting; it never names them (pauses end silently). */}
      <section className={styles.metrics} aria-label="At a glance">
        <div className={styles.metric}>
          <span className={styles.metricLabel}>This month</span>
          <span className={styles.metricValue}>{dollars(spend)}</span>
          <span className={styles.metricNote}>
            {planAmount === null ? `No plan set for ${formatMonthLabel(monthKey)} yet.` : `of your ${dollars(planAmount)} plan`}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Saved</span>
          <span className={`${styles.metricValue} ${styles.metricValueAccent}`}>{dollars(kept.totalKept)}</span>
          <span className={styles.metricNote}>
            {kept.itemsLetGo} {kept.itemsLetGo === 1 ? "thing" : "things"} let go this month
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Paused right now</span>
          <span className={styles.metricValue}>{pausedCount}</span>
          <span className={styles.metricNote}>{pausedCount === 1 ? "item" : "items"} waiting it out</span>
        </div>
        <a href="/wardrobe" className={`${styles.metric} ${styles.metricLink}`}>
          <span className={styles.metricLabel}>Your closet</span>
          <span className={styles.metricValue}>{pieceCount}</span>
          <span className={styles.metricNote}>{`${pieceCount === 1 ? "piece" : "pieces"} you already own`}</span>
        </a>
      </section>

      <div className={styles.cards}>
        <section className={styles.card} aria-labelledby="month-heading">
          <h2 id="month-heading" className={styles.cardTitle}>
            This month
          </h2>
          {planAmount === null ? (
            <p className={styles.cardText}>
              Set a monthly plan to see what each purchase does to it.{" "}
              <a href="/budget" className="link">
                Set a plan
              </a>
            </p>
          ) : (
            <>
              <div className={styles.planBar} aria-hidden="true">
                <span style={{ width: `${spentShare}%` }} />
              </div>
              {remaining !== null && (
                <ReceiptBlock
                  rows={[
                    { label: "Spent", amount: dollars(spend) },
                    { label: "Plan", amount: dollars(planAmount) },
                  ]}
                  closing={
                    isOver
                      ? { label: `${dollars(Math.abs(remaining))} over your plan`, over: true }
                      : { label: "Left", amount: dollars(remaining), over: false }
                  }
                />
              )}
            </>
          )}
          {kept.itemsLetGo > 0 && (
            <a href="/considering?tab=let-go" className={styles.keptLine}>
              {dollars(kept.totalKept)} saved by letting {kept.itemsLetGo} {kept.itemsLetGo === 1 ? "thing" : "things"}{" "}
              go &rarr;
            </a>
          )}
        </section>

        <section className={styles.card} aria-labelledby="closet-heading">
          <h2 id="closet-heading" className={styles.cardTitle}>
            Recently added
          </h2>
          {rackItems.length > 0 && (
            <>
              <RackSlice items={rackItems} />
              <a href="/wardrobe?view=rack" className={styles.closetLink}>
                See your closet &rarr;
              </a>
            </>
          )}
          {rackItems.length === 0 &&
            (pieceCount === 0 ? (
              <a href="/wardrobe#add-to-wardrobe" className={styles.quietLink}>
                Add your first piece &rarr;
              </a>
            ) : (
              <a href="/wardrobe?view=rack" className={styles.quietLink}>
                See your closet &rarr;
              </a>
            ))}
        </section>
      </div>

      <QuoteBand text={quote.text} source={quote.source} />
    </div>
  );
}
