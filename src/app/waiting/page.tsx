import { prisma } from "@/lib/prisma";
import { listWaitingQueue } from "@/lib/waitQueue";

export default async function WaitingQueuePage() {
  const user = await prisma.user.findFirst();
  const { elapsed, stillWaiting } = user
    ? await listWaitingQueue(user.id)
    : { elapsed: [], stillWaiting: [] };

  return (
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Waiting on these</h1>
      <p>
        <a href="/">Back to home</a>
      </p>

      <h2>Ready for a decision</h2>
      {elapsed.length === 0 ? (
        <p>Nothing has finished waiting yet.</p>
      ) : (
        <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: "1rem" }}>
          {elapsed.map((item) => (
            <li key={item.id} style={{ borderBottom: "1px solid #ddd", paddingBottom: "1rem" }}>
              <div>
                <strong>{item.itemName}</strong>
                {item.price && ` - $${Number(item.price).toFixed(2)}`}
              </div>
              <form
                action={`/api/desired-items/${item.id}/resolve`}
                method="POST"
                style={{ display: "inline-block", marginRight: "0.75rem", marginTop: "0.5rem" }}
              >
                <input type="hidden" name="outcome" value="proceeded" />
                <button type="submit">I still want this</button>
              </form>
              <form
                action={`/api/desired-items/${item.id}/resolve`}
                method="POST"
                style={{ display: "inline-block", marginTop: "0.5rem" }}
              >
                <input type="hidden" name="outcome" value="dropped" />
                <button type="submit">No, drop it</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: "2rem" }}>Still waiting</h2>
      {stillWaiting.length === 0 ? (
        <p>Nothing else is currently waiting.</p>
      ) : (
        <ul>
          {stillWaiting.map((item) => (
            <li key={item.id}>
              {item.itemName} - until {item.waitUntil?.toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
