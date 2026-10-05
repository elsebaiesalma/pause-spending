import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";

export default async function PurchasesPage() {
  const userId = await requireUserIdOrRedirect();
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    orderBy: { orderDate: "desc" },
  });

  return (
    <div className="page page--wide">
      <span className="page__eyebrow">History</span>
      <h1>Purchase history</h1>

      {purchases.length === 0 ? (
        <p className="page__lede section">No purchases yet - run a sync to import some from your connected email.</p>
      ) : (
        <div className="section">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="item-row" style={{ alignItems: "flex-start" }}>
              {purchase.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={purchase.imageUrl} alt={purchase.itemName} className="item-row__thumb" />
              ) : (
                <div className="item-row__thumb" />
              )}
              <div className="item-row__body">
                <div className="item-row__title">
                  {purchase.itemName}{" "}
                  {purchase.status === "needs_review" && <span className="badge-review">Needs review</span>}
                </div>
                <div className="item-row__meta">
                  {purchase.merchant} · {purchase.category} · {purchase.orderDate.toLocaleDateString()}
                </div>
                {purchase.status === "needs_review" && (
                  <div className="stack" style={{ marginTop: "0.6rem" }}>
                    <p className="page__lede" style={{ fontSize: "0.85rem" }}>
                      {purchase.price === null
                        ? "We couldn't confidently read this one's price - enter it to confirm, or discard it."
                        : "We couldn't confidently read this one - confirm the details or discard it."}
                    </p>
                    <form
                      action={`/api/purchases/${purchase.id}/confirm`}
                      method="POST"
                      className="row"
                      style={{ maxWidth: "none" }}
                    >
                      <input name="itemName" defaultValue={purchase.itemName} placeholder="Item name" required />
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={purchase.price === null ? undefined : Number(purchase.price)}
                        placeholder="Price"
                        required
                      />
                      <input name="category" defaultValue={purchase.category} placeholder="Category" required />
                      <button type="submit">Confirm</button>
                    </form>
                    <form action={`/api/purchases/${purchase.id}/discard`} method="POST">
                      <button type="submit" className="btn-quiet">
                        Discard
                      </button>
                    </form>
                  </div>
                )}
              </div>
              <div className="item-row__price">
                {purchase.price === null ? "price unknown" : `$${Number(purchase.price).toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
