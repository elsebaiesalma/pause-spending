import { prisma } from "@/lib/prisma";
import { listWaitingQueue } from "@/lib/waitQueue";
import { listActiveWardrobeItems } from "@/lib/wardrobe";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";

export default async function DashboardPage() {
  const user = await prisma.user.findFirst();

  const gmailConnection = user
    ? await prisma.emailConnection.findUnique({
        where: { userId_provider: { userId: user.id, provider: "gmail" } },
      })
    : null;
  const waitingQueue = user ? await listWaitingQueue(user.id) : null;
  const wardrobeCount = user ? (await listActiveWardrobeItems(user.id)).length : 0;

  const monthKey = currentMonthKey();
  const budget = user ? await getBudgetForMonth(user.id, monthKey) : null;
  const spend = user ? await getMonthSpend(user.id, monthKey) : 0;

  const droppedItems = user
    ? await prisma.desiredItem.findMany({
        where: { userId: user.id, decisionOutcome: "dropped" },
        select: { price: true },
      })
    : [];
  const droppedTotal = droppedItems.reduce((sum, item) => sum + (item.price ? Number(item.price) : 0), 0);

  return (
    <div className="page">
      <span className="page__eyebrow">Your account</span>
      <h1>Dashboard</h1>

      {waitingQueue && waitingQueue.elapsed.length > 0 && (
        <p className="section">
          <a href="/waiting" className="link">
            {waitingQueue.elapsed.length} item{waitingQueue.elapsed.length === 1 ? "" : "s"} ready for
            your decision
          </a>
        </p>
      )}

      <p className="section">
        <a href="/desired-items/new" className="btn btn-primary">
          I want to buy something
        </a>
      </p>

      <div className="section stat-band" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" }}>
        <div>
          <div className="page__eyebrow">In your wardrobe</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>{wardrobeCount}</div>
        </div>
        <div>
          <div className="page__eyebrow">Talked yourself out of</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>{droppedItems.length}</div>
          {droppedTotal > 0 && <p className="page__lede">${droppedTotal.toFixed(2)} not spent, so far.</p>}
        </div>
        <div>
          <div className="page__eyebrow">This month</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>${spend.toFixed(0)}</div>
          <p className="page__lede">{budget ? `of a $${Number(budget.amount).toFixed(0)} budget.` : "no budget set."}</p>
        </div>
        <div>
          <div className="page__eyebrow">Still waiting</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>
            {waitingQueue ? waitingQueue.stillWaiting.length : 0}
          </div>
        </div>
      </div>

      <nav className="nav-links section">
        <a href="/purchases" className="link">
          Purchase history
        </a>
        <a href="/wardrobe" className="link">
          Wardrobe
        </a>
        <a href="/budget" className="link">
          Budget
        </a>
        <a href="/wishlist" className="link">
          Wishlist
        </a>
      </nav>

      {gmailConnection?.status === "connected" ? (
        <div className="section stack">
          <p className="page__lede">Gmail connected since {gmailConnection.connectedAt.toLocaleString()}.</p>
          <div className="row">
            <form action="/api/sync/gmail/run" method="POST">
              <button type="submit">Sync now</button>
            </form>
            <form action="/api/auth/gmail/disconnect" method="POST">
              <button type="submit">Disconnect</button>
            </form>
            <a href="/connect/gmail/delete" className="btn btn-danger">
              Permanently delete my data
            </a>
          </div>
        </div>
      ) : gmailConnection?.status === "expired" ? (
        <div className="section stack">
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
        <div className="section stack">
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
        <p className="section">
          <a href="/connect/gmail" className="btn">
            Connect Gmail
          </a>
        </p>
      )}
    </div>
  );
}
