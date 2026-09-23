import { prisma } from "@/lib/prisma";
import { listWaitingQueue } from "@/lib/waitQueue";
import { listActiveWardrobeItems } from "@/lib/wardrobe";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { clashDisplay } from "./fonts";
import { ScrollReveal } from "./ScrollReveal";
import styles from "./page.module.css";

export default async function Home() {
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
    <div className={`${styles.root} ${clashDisplay.variable}`}>
      <ScrollReveal />
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true">
        <div className={styles.glowBlob} />
        <div className={styles.glowBlob} />
      </div>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          Before the cart
        </span>
        <h1 className={styles.heroHeadline}>
          Buy less.
          <br />
          Want it <em>more.</em>
        </h1>
        <p className={styles.heroLede}>
          Pause reads your own order history to show what you already own before you buy something
          new - what it costs this month, and whether it&apos;s worth the wait.
        </p>
        <div className={styles.heroActions}>
          <a href="/desired-items/new" className={styles.btnPrimary}>
            I want to buy something
          </a>
          {waitingQueue && waitingQueue.elapsed.length > 0 && (
            <a href="/waiting" className={styles.btnGhost}>
              {waitingQueue.elapsed.length} item{waitingQueue.elapsed.length === 1 ? "" : "s"} ready for
              a decision
            </a>
          )}
        </div>
      </section>

      <div className={styles.statGrid}>
        <div className={`reveal ${styles.stat}`} data-reveal>
          <span className={styles.statLabel}>In your wardrobe</span>
          <div className={styles.statValue}>{wardrobeCount}</div>
          <p className={styles.statNote}>items catalogued, synced and manual combined.</p>
        </div>
        <div className={`reveal ${styles.stat}`} data-reveal>
          <span className={styles.statLabel}>Talked yourself out of</span>
          <div className={styles.statValue}>{droppedItems.length}</div>
          <p className={styles.statNote}>
            {droppedTotal > 0 ? `$${droppedTotal.toFixed(2)} not spent, so far.` : "nothing dropped yet - that's fine too."}
          </p>
        </div>
        <div className={`reveal ${styles.stat}`} data-reveal>
          <span className={styles.statLabel}>This month</span>
          <div className={styles.statValue}>${spend.toFixed(0)}</div>
          <p className={styles.statNote}>
            {budget ? `of a $${Number(budget.amount).toFixed(0)} budget.` : (
              <>
                no budget set - <a href="/budget" style={{ color: "inherit", textDecoration: "underline" }}>set one</a>.
              </>
            )}
          </p>
        </div>
        <div className={`reveal ${styles.stat}`} data-reveal>
          <span className={styles.statLabel}>Still waiting</span>
          <div className={styles.statValue}>{waitingQueue ? waitingQueue.stillWaiting.length : 0}</div>
          <p className={styles.statNote}>items in the 24h/7-day cooldown right now.</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className="reveal" data-reveal>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Your closet
          </span>
          <div className={styles.navGrid}>
            <a href="/purchases" className={styles.navLink}>
              Purchase history <span className={styles.navLinkArrow}>&rarr;</span>
            </a>
            <a href="/wardrobe" className={styles.navLink}>
              Wardrobe <span className={styles.navLinkArrow}>&rarr;</span>
            </a>
            <a href="/budget" className={styles.navLink}>
              Budget <span className={styles.navLinkArrow}>&rarr;</span>
            </a>
            <a href="/wishlist" className={styles.navLink}>
              Wishlist <span className={styles.navLinkArrow}>&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`reveal ${styles.statusPanel}`} data-reveal>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Gmail sync
          </span>
          {gmailConnection?.status === "connected" ? (
            <>
              <h2 className={styles.statusHeading}>Connected</h2>
              <p className={styles.statusBody}>
                Since {gmailConnection.connectedAt.toLocaleString()}. New order confirmations sync in
                automatically.
              </p>
              <div className={styles.actionRow}>
                <form action="/api/sync/gmail/run" method="POST">
                  <button type="submit" className={styles.btnGhost}>
                    Sync now
                  </button>
                </form>
                <form action="/api/auth/gmail/disconnect" method="POST">
                  <button type="submit" className={styles.btnGhost}>
                    Disconnect
                  </button>
                </form>
                <a href="/connect/gmail/delete" className={styles.btnGhost}>
                  Permanently delete my data
                </a>
              </div>
            </>
          ) : gmailConnection?.status === "expired" ? (
            <>
              <h2 className={styles.statusHeading}>Reconnect needed</h2>
              <p className={styles.statusBody}>Your Gmail connection expired - reconnect to keep syncing.</p>
              <div className={styles.actionRow}>
                <a href="/connect/gmail" className={styles.btnPrimary}>
                  Reconnect Gmail
                </a>
                <a href="/connect/gmail/delete" className={styles.btnGhost}>
                  Permanently delete my data
                </a>
              </div>
            </>
          ) : gmailConnection?.status === "disconnected" ? (
            <>
              <h2 className={styles.statusHeading}>Disconnected</h2>
              <p className={styles.statusBody}>Previously parsed data is kept.</p>
              <div className={styles.actionRow}>
                <a href="/connect/gmail" className={styles.btnPrimary}>
                  Reconnect Gmail
                </a>
                <a href="/connect/gmail/delete" className={styles.btnGhost}>
                  Permanently delete my data
                </a>
              </div>
            </>
          ) : (
            <>
              <h2 className={styles.statusHeading}>Not connected yet</h2>
              <p className={styles.statusBody}>
                Connect Gmail so Pause can build your wardrobe from real order history.
              </p>
              <a href="/connect/gmail" className={styles.btnPrimary}>
                Connect Gmail
              </a>
            </>
          )}
        </div>
      </section>

      <div className={styles.ghostMark} aria-hidden="true">
        PAUSE
      </div>
    </div>
  );
}
