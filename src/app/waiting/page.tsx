import { prisma } from "@/lib/prisma";
import { listWaitingQueue } from "@/lib/waitQueue";

export default async function WaitingQueuePage() {
  const user = await prisma.user.findFirst();
  const { elapsed, stillWaiting } = user
    ? await listWaitingQueue(user.id)
    : { elapsed: [], stillWaiting: [] };

  return (
    <div className="page">
      <span className="page__eyebrow">The pause</span>
      <h1>Waiting on these</h1>

      <h2>Ready for a decision</h2>
      {elapsed.length === 0 ? (
        <p className="page__lede">Nothing has finished waiting yet.</p>
      ) : (
        <div>
          {elapsed.map((item) => (
            <div key={item.id} className="section stack--tight" style={{ marginTop: "var(--space-2)" }}>
              <div className="item-row__title">
                {item.itemName}
                {item.price && ` - $${Number(item.price).toFixed(2)}`}
              </div>
              <div className="row">
                <form action={`/api/desired-items/${item.id}/resolve`} method="POST">
                  <input type="hidden" name="outcome" value="proceeded" />
                  <button type="submit">I still want this</button>
                </form>
                <form action={`/api/desired-items/${item.id}/resolve`} method="POST">
                  <input type="hidden" name="outcome" value="dropped" />
                  <button type="submit" className="btn-quiet">
                    No, drop it
                  </button>
                </form>
              </div>
              <hr className="divider" style={{ margin: "var(--space-2) 0 0" }} />
            </div>
          ))}
        </div>
      )}

      <h2>Still waiting</h2>
      {stillWaiting.length === 0 ? (
        <p className="page__lede">Nothing else is currently waiting.</p>
      ) : (
        <div className="stack--tight">
          {stillWaiting.map((item) => (
            <p key={item.id} className="page__lede">
              {item.itemName} - until {item.waitUntil?.toLocaleString()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
