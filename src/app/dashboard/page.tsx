import { prisma } from "@/lib/prisma";
import { listWaitingQueue } from "@/lib/waitQueue";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { getKeptSummary, type KeptSummary } from "@/lib/dashboard/kept";
import { formatUnlockTime } from "@/lib/dashboard/unlockTime";
import { requireUserIdOrRedirect } from "@/lib/session";
import { csrfTokenForUser } from "@/lib/csrf";
import { KeptToggle } from "./KeptToggle";
import { DashboardTopNav, DashboardBottomTabBar } from "./DashboardNav";
import styles from "./page.module.css";

const EMPTY_KEPT: KeptSummary = { totalKept: 0, itemsLetGo: 0 };

export default async function DashboardPage() {
  const userId = await requireUserIdOrRedirect();
  const monthKey = currentMonthKey();

  const [gmailConnection, waitingQueue, totalDesiredItemsCount, releasedCount, budget, spend, needsReviewCount, recentPurchases] =
    await Promise.all([
      prisma.emailConnection.findUnique({ where: { userId_provider: { userId, provider: "gmail" } } }),
      listWaitingQueue(userId),
      prisma.desiredItem.count({ where: { userId } }),
      prisma.desiredItem.count({ where: { userId, decisionOutcome: "dropped" } }),
      getBudgetForMonth(userId, monthKey),
      getMonthSpend(userId, monthKey),
      prisma.purchase.count({ where: { userId, status: "needs_review" } }),
      prisma.purchase.findMany({ where: { userId, status: "active" }, orderBy: { orderDate: "desc" }, take: 5 }),
    ]);

  // Only computed once at least one item has actually been released -
  // otherwise it's always $0/0, so there's no reason to pay for the query.
  const [keptThisMonth, keptAllTime] =
    releasedCount > 0
      ? await Promise.all([getKeptSummary(userId, "this_month"), getKeptSummary(userId, "all_time")])
      : [EMPTY_KEPT, EMPTY_KEPT];

  const onPauseItems = [...waitingQueue.elapsed, ...waitingQueue.stillWaiting];
  const spendRemaining = budget ? Number(budget.amount) - spend : null;
  const isOverBudget = spendRemaining !== null && spendRemaining < 0;

  return (
    <div className={`page page--wide ${styles.dashboardPage}`}>
      <DashboardTopNav active="home" />

      <div className={styles.topBand}>
        <div className={styles.topHalf}>
          <span className="page__eyebrow">Kept</span>
          {releasedCount > 0 ? (
            <KeptToggle thisMonth={keptThisMonth} allTime={keptAllTime} />
          ) : totalDesiredItemsCount === 0 ? (
            <>
              <p className={styles.statValue} style={{ fontSize: "1.35rem" }}>
                Pause your first item
              </p>
              <p className={styles.statNote}>See what you&apos;d keep by giving one purchase a moment first.</p>
              <a href="/desired-items/new" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>
                Add an item
              </a>
            </>
          ) : (
            <p className={styles.statNote} style={{ marginTop: "0.5rem" }}>
              Nothing let go yet - {onPauseItems.length} item{onPauseItems.length === 1 ? "" : "s"} on pause
            </p>
          )}
        </div>

        <div className={styles.topHalf}>
          <span className="page__eyebrow">This month</span>
          {!budget ? (
            <>
              <p className={styles.statNote}>No plan set for {monthKey} yet.</p>
              <form action="/api/budget" method="POST" className={styles.inlineBudgetForm}>
                <input name="amount" type="number" step="0.01" min="0" placeholder="0.00" required />
                <button type="submit" className="btn-primary">
                  Set plan
                </button>
              </form>
            </>
          ) : (
            <>
              <div className={styles.statValue}>
                ${spend.toFixed(0)} <span className={styles.statValueMuted}>of ${Number(budget.amount).toFixed(0)}</span>
              </div>
              {isOverBudget ? (
                <p className={styles.statNote} style={{ color: "var(--color-accent)" }}>
                  ${Math.abs(spendRemaining as number).toFixed(0)} over your plan
                </p>
              ) : (
                <p className={styles.statNote}>${(spendRemaining as number).toFixed(0)} left in your plan</p>
              )}
              <a href="/budget" className="btn-quiet" style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
                Edit plan
              </a>
            </>
          )}
        </div>
      </div>

      {needsReviewCount > 0 && (
        <a href="/purchases" className={styles.receiptsBanner}>
          {needsReviewCount} receipt{needsReviewCount === 1 ? "" : "s"} need a quick look &rarr;
        </a>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>01 / On pause</h2>
        {onPauseItems.length === 0 ? (
          <p className="page__lede">Nothing on pause right now.</p>
        ) : (
          <div className={styles.onPauseTrack}>
            {onPauseItems.map((item) => (
              <a key={item.id} href={`/desired-items/${item.id}/pause`} className={styles.onPauseCard}>
                {/* The image slot is its own block so it can be hidden
                    later without touching the rest of the card (planned
                    locked-pause feature). */}
                <div className={styles.onPauseImage}>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" />
                  )}
                </div>
                <div className={styles.onPauseBody}>
                  <div className="item-row__title">{item.itemName ?? "Untitled item"}</div>
                  {item.brand && <div className="item-row__meta">{item.brand}</div>}
                  <div className={styles.onPauseUnlock}>
                    {item.waitUntil ? formatUnlockTime(item.waitUntil) : "ready for a decision"}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>02 / Recent purchases</h2>
        {recentPurchases.length === 0 ? (
          <p className="page__lede">No purchases synced yet.</p>
        ) : (
          <div>
            {recentPurchases.map((purchase) => (
              <div key={purchase.id} className="item-row">
                {purchase.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={purchase.imageUrl} alt={purchase.itemName} className="item-row__thumb" />
                ) : (
                  <div className="item-row__thumb" />
                )}
                <div className="item-row__body">
                  <div className="item-row__title">{purchase.itemName}</div>
                  <div className="item-row__meta">
                    {purchase.merchant} · {purchase.orderDate.toLocaleDateString()}
                  </div>
                </div>
                <div className="item-row__price">${Number(purchase.price).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
        <a href="/wardrobe" className="link section">
          See all in wardrobe &rarr;
        </a>
      </section>

      {/* Account / Gmail connection - unobtrusive, below the prescribed
          layout so it doesn't compete with it, but disconnect/delete stay
          reachable since they're real, data-affecting actions. */}
      <section className={styles.section}>
        <span className="page__eyebrow">Account</span>
        {gmailConnection?.status === "connected" ? (
          <div className="stack" style={{ marginTop: "0.5rem" }}>
            <p className="page__lede">Gmail connected since {gmailConnection.connectedAt.toLocaleString()}.</p>
            <div className="row">
              <form action="/api/sync/gmail/run" method="POST">
                <button type="submit">Sync now</button>
              </form>
              <form action="/api/auth/gmail/disconnect" method="POST">
                <input type="hidden" name="csrfToken" value={csrfTokenForUser(userId)} />
                <button type="submit">Disconnect</button>
              </form>
              <a href="/connect/gmail/delete" className="btn btn-danger">
                Permanently delete my data
              </a>
              <a href="/purchases" className="btn-quiet">
                Purchase history
              </a>
            </div>
          </div>
        ) : gmailConnection?.status === "expired" ? (
          <div className="stack" style={{ marginTop: "0.5rem" }}>
            <p className="page__lede">
              Your Gmail connection has expired and needs to be reconnected before syncing can continue.
            </p>
            <div className="row">
              <a href="/connect/gmail" className="btn btn-primary">
                Reconnect Gmail
              </a>
              <a href="/connect/gmail/delete" className="btn-quiet">
                Permanently delete my data
              </a>
            </div>
          </div>
        ) : gmailConnection?.status === "disconnected" ? (
          <div className="stack" style={{ marginTop: "0.5rem" }}>
            <p className="page__lede">Gmail is disconnected. Previously parsed data is kept.</p>
            <div className="row">
              <a href="/connect/gmail" className="btn btn-primary">
                Reconnect Gmail
              </a>
              <a href="/connect/gmail/delete" className="btn-quiet">
                Permanently delete my data
              </a>
            </div>
          </div>
        ) : (
          <p style={{ marginTop: "0.5rem" }}>
            <a href="/connect/gmail" className="btn">
              Connect Gmail
            </a>
          </p>
        )}
      </section>

      <DashboardBottomTabBar active="home" />
    </div>
  );
}
