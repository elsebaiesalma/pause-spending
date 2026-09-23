import { prisma } from "@/lib/prisma";
import { listWaitingQueue } from "@/lib/waitQueue";

export default async function Home() {
  const user = await prisma.user.findFirst();
  const gmailConnection = user
    ? await prisma.emailConnection.findUnique({
        where: { userId_provider: { userId: user.id, provider: "gmail" } },
      })
    : null;
  const waitingQueue = user ? await listWaitingQueue(user.id) : null;

  return (
    <div className="page">
      <span className="page__eyebrow">Before you buy</span>
      <h1>A moment, before the cart.</h1>
      <p className="page__lede">
        What you already own that&apos;s like it, what it costs you this month, and whether it&apos;s
        worth the wait.
      </p>

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

      {gmailConnection?.status === "connected" ? (
        <div className="section stack">
          <p className="page__lede">Gmail connected since {gmailConnection.connectedAt.toLocaleString()}.</p>
          <nav className="nav-links">
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
          <hr className="divider" />
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
