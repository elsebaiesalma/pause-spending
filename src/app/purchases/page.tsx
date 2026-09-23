import { prisma } from "@/lib/prisma";

export default async function PurchasesPage() {
  const user = await prisma.user.findFirst();
  const purchases = user
    ? await prisma.purchase.findMany({
        where: { userId: user.id },
        orderBy: { orderDate: "desc" },
      })
    : [];

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
                      We couldn&apos;t confidently read this one - confirm the details or discard it.
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
                        defaultValue={Number(purchase.price)}
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
              <div className="item-row__price">${Number(purchase.price).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
