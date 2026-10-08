import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listWaitingQueue } from "@/lib/waitQueue";
import { currentMonthKey, getBudgetForMonth, getMonthSpend, monthKeyToRange } from "@/lib/budget";
import { getKeptSummary } from "@/lib/dashboard/kept";
import { quoteForDay } from "@/lib/dashboard/dailyQuote";
import { colorStripeSegments } from "@/lib/dashboard/colorStripe";
import { BigNumeral } from "@/components/kit/BigNumeral";
import { ColorStripe } from "@/components/kit/ColorStripe";
import { QuoteBand } from "@/components/kit/QuoteBand";
import { ReceiptBlock } from "@/components/kit/ReceiptBlock";
import { LocalGreeting } from "./LocalGreeting";
import { SmartAdd } from "./SmartAdd";
import styles from "./page.module.css";

const RECEIPT_LINE_LIMIT = 5;
const PAUSE_LINE_LIMIT = 3;

// orderDate is a calendar date stored at UTC midnight, so format it in UTC or
// it can slide back a day in timezones behind UTC.
const RECEIPT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

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

  const monthKey = currentMonthKey();
  const { start, end } = monthKeyToRange(monthKey);
  const thisMonth = { userId, status: "active", orderDate: { gte: start, lt: end } };

  const [waitingQueue, budget, spend, needsReviewCount, receiptRows, monthPurchaseCount, kept, wardrobeColors] =
    await Promise.all([
      listWaitingQueue(userId),
      getBudgetForMonth(userId, monthKey),
      getMonthSpend(userId, monthKey),
      prisma.purchase.count({ where: { userId, status: "needs_review" } }),
      prisma.purchase.findMany({
        where: thisMonth,
        orderBy: { orderDate: "desc" },
        take: RECEIPT_LINE_LIMIT,
      }),
      prisma.purchase.count({ where: thisMonth }),
      getKeptSummary(userId, "this_month"),
      // Same "in the wardrobe" rule as the Wardrobe page: everything except returned.
      prisma.wardrobeItem.findMany({
        where: { userId, status: { not: "returned" } },
        select: { colorFamily: true },
      }),
    ]);

  const planAmount = budget ? Number(budget.amount) : null;
  const remaining = planAmount === null ? null : planAmount - spend;
  const isOver = remaining !== null && remaining < 0;

  const receiptLines = receiptRows.map((purchase) => ({
    id: purchase.id,
    date: RECEIPT_DATE_FORMAT.format(purchase.orderDate),
    name: purchase.itemName,
    brand: purchase.merchant,
    price: `$${Number(purchase.price).toFixed(2)}`,
  }));

  const pieceCount = wardrobeColors.length;
  const stripeSegments = colorStripeSegments(wardrobeColors.map((item) => item.colorFamily));
  const quote = quoteForDay();
  const pauseEnded = waitingQueue.elapsed.slice(0, PAUSE_LINE_LIMIT);

  return (
    <div className={`page ${styles.home}`}>
      <LocalGreeting firstName={firstName} />

      <SmartAdd searchAvailable={Boolean(process.env.BRAVE_SEARCH_API_KEY)} />

      {(needsReviewCount > 0 || pauseEnded.length > 0) && (
        <div className={styles.statusLines}>
          {needsReviewCount > 0 && (
            <a href="/purchases" className={styles.statusLine}>
              {needsReviewCount} receipt{needsReviewCount === 1 ? "" : "s"} need a quick look &rarr;
            </a>
          )}
          {pauseEnded.map((item) => (
            <a key={item.id} href={`/desired-items/${item.id}/pause`} className={styles.statusLine}>
              Your pause on {item.itemName ?? "an item"} is up. Decide when you&apos;re ready &rarr;
            </a>
          ))}
        </div>
      )}

      <div className={styles.numerals}>
        <div className={styles.column}>
          {planAmount === null ? (
            <BigNumeral label="This month" value={dollars(spend)} note={`No plan set for ${monthKey} yet.`}>
              <form action="/api/budget" method="POST" className={styles.inlineBudgetForm}>
                <label htmlFor="home-plan" className="sr-only">
                  Monthly plan amount
                </label>
                <input id="home-plan" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required />
                <button type="submit" className="btn btn-primary">
                  Set plan
                </button>
              </form>
            </BigNumeral>
          ) : (
            <BigNumeral label="This month" value={dollars(spend)} note={`of your ${dollars(planAmount)} plan`} />
          )}

          {kept.itemsLetGo > 0 && (
            <a href="/considering" className={styles.keptLine}>
              {dollars(kept.totalKept)} kept by letting {kept.itemsLetGo} {kept.itemsLetGo === 1 ? "thing" : "things"}{" "}
              go &rarr;
            </a>
          )}

          {(monthPurchaseCount > 0 || remaining !== null) && (
            <ReceiptBlock
              lines={receiptLines}
              moreCount={Math.max(0, monthPurchaseCount - receiptLines.length)}
              total={
                remaining === null
                  ? null
                  : {
                      label: isOver ? "Over your plan" : "Left in your plan",
                      amount: dollars(Math.abs(remaining)),
                      over: isOver,
                    }
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
          >
            <ColorStripe segments={stripeSegments} />
          </BigNumeral>
        </div>
      </div>

      <QuoteBand text={quote.text} source={quote.source} />
    </div>
  );
}
