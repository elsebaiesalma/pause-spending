import { prisma } from "@/lib/prisma";
import { formatMonthLabel } from "@/lib/monthLabel";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { getKeptSummary } from "@/lib/dashboard/kept";
import { quoteForDay } from "@/lib/dashboard/dailyQuote";
import { sweepEndedPauses } from "@/lib/considering/consideringMeta";
import { recentHangingEntries, toWardrobeEntry } from "@/lib/wardrobeEntries";
import { BigNumeral } from "@/components/kit/BigNumeral";
import { QuoteBand } from "@/components/kit/QuoteBand";
import { ReceiptBlock } from "@/components/kit/ReceiptBlock";
import { LocalGreeting } from "./LocalGreeting";
import { PauseConfirmation } from "@/components/PauseConfirmation";
import { RackSlice } from "./RackSlice";
import { SmartAdd } from "./SmartAdd";
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

  const [budget, spend, needsReviewCount, kept, wardrobeRows] = await Promise.all([
    getBudgetForMonth(userId, monthKey),
    getMonthSpend(userId, monthKey),
    prisma.purchase.count({ where: { userId, status: "needs_review" } }),
    getKeptSummary(userId, "this_month"),
    // Same "in the wardrobe" rule as the Wardrobe page: everything except returned.
    prisma.wardrobeItem.findMany({
      where: { userId, status: { not: "returned" } },
      include: { sourcePurchase: { select: { merchant: true, price: true } } },
    }),
  ]);

  const planAmount = budget ? Number(budget.amount) : null;
  const remaining = planAmount === null ? null : planAmount - spend;
  const isOver = remaining !== null && remaining < 0;

  const pieceCount = wardrobeRows.length;
  const rackItems = recentHangingEntries(wardrobeRows.map(toWardrobeEntry), RACK_SLICE_ITEMS);
  const quote = quoteForDay();

  return (
    <div className={`page ${styles.home}`}>
      <LocalGreeting firstName={firstName} />
      <PauseConfirmation />

      <SmartAdd searchAvailable={Boolean(process.env.BRAVE_SEARCH_API_KEY)} />

      {needsReviewCount > 0 && (
        <div className={styles.statusLines}>
          <a href="/purchases" className={styles.statusLine}>
            {needsReviewCount} receipt{needsReviewCount === 1 ? "" : "s"} need a quick look &rarr;
          </a>
        </div>
      )}

      <div className={styles.numerals}>
        <div className={styles.column}>
          {planAmount === null ? (
            <BigNumeral label="This month" value={dollars(spend)} note={`No plan set for ${formatMonthLabel(monthKey)} yet.`}>
              <a href="/budget" className={styles.planLink}>
                Set a plan &rarr;
              </a>
            </BigNumeral>
          ) : (
            <BigNumeral label="This month" value={dollars(spend)} note={`of your ${dollars(planAmount)} plan`} />
          )}

          {kept.itemsLetGo > 0 && (
            <a href="/considering/let-go" className={styles.keptLine}>
              {dollars(kept.totalKept)} kept by letting {kept.itemsLetGo} {kept.itemsLetGo === 1 ? "thing" : "things"}{" "}
              go &rarr;
            </a>
          )}

          {planAmount !== null && remaining !== null && (
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
        </div>

        <div className={styles.column}>
          <BigNumeral
            label="Your wardrobe"
            value={pieceCount}
            note={`${pieceCount === 1 ? "piece" : "pieces"} you already own`}
            href="/wardrobe"
          />

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
        </div>
      </div>

      <QuoteBand text={quote.text} source={quote.source} />
    </div>
  );
}
