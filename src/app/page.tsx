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
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Pause Before Purchase</h1>

      {waitingQueue && waitingQueue.elapsed.length > 0 && (
        <p>
          <a href="/waiting">
            {waitingQueue.elapsed.length} item{waitingQueue.elapsed.length === 1 ? "" : "s"} ready for
            your decision
          </a>
        </p>
      )}

      <p>
        <a href="/desired-items/new">I want to buy something</a>
      </p>

      {gmailConnection?.status === "connected" ? (
        <>
          <p>Gmail connected since {gmailConnection.connectedAt.toLocaleString()}.</p>
          <p>
            <a href="/purchases">View purchase history</a>
            {" · "}
            <a href="/wardrobe">View wardrobe</a>
            {" · "}
            <a href="/budget">View budget</a>
            {" · "}
            <a href="/wishlist">View wishlist</a>
          </p>
          <form action="/api/sync/gmail/run" method="POST" style={{ display: "inline-block", marginRight: "1rem" }}>
            <button type="submit">Sync now</button>
          </form>
          <form action="/api/auth/gmail/disconnect" method="POST" style={{ display: "inline-block", marginRight: "1rem" }}>
            <button type="submit">Disconnect</button>
          </form>
          <a href="/connect/gmail/delete">Permanently delete my data</a>
        </>
      ) : gmailConnection?.status === "expired" ? (
        <>
          <p>Your Gmail connection has expired and needs to be reconnected before syncing can continue.</p>
          <a href="/connect/gmail">Reconnect Gmail</a>
          {" · "}
          <a href="/connect/gmail/delete">Permanently delete my data</a>
        </>
      ) : gmailConnection?.status === "disconnected" ? (
        <>
          <p>Gmail is disconnected. Previously parsed data is kept.</p>
          <a href="/connect/gmail">Reconnect Gmail</a>
          {" · "}
          <a href="/connect/gmail/delete">Permanently delete my data</a>
        </>
      ) : (
        <a href="/connect/gmail">Connect Gmail</a>
      )}
    </main>
  );
}
