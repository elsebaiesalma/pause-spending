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
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Purchase History</h1>
      <p>
        <a href="/">Back to home</a>
      </p>

      {purchases.length === 0 ? (
        <p>No purchases yet - run a sync to import some from your connected email.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {purchases.map((purchase) => (
            <li
              key={purchase.id}
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                borderBottom: "1px solid #ddd",
                padding: "0.75rem 0",
              }}
            >
              {purchase.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={purchase.imageUrl}
                  alt={purchase.itemName}
                  width={56}
                  height={56}
                  style={{ objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 6,
                    background: "#eee",
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div>
                  <strong>{purchase.itemName}</strong>{" "}
                  {purchase.status === "needs_review" && (
                    <span style={{ color: "#c5221f", fontSize: "0.85rem" }}>(needs review)</span>
                  )}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#555" }}>
                  {purchase.merchant} · {purchase.category} ·{" "}
                  {purchase.orderDate.toLocaleDateString()}
                </div>
                {purchase.status === "needs_review" && (
                  <>
                    <p style={{ fontSize: "0.85rem", color: "#555", marginBottom: "0.25rem" }}>
                      We couldn&apos;t confidently read this one - confirm the details or discard it.
                    </p>
                    <form
                      action={`/api/purchases/${purchase.id}/confirm`}
                      method="POST"
                      style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.4rem" }}
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
                      <button type="submit">Discard</button>
                    </form>
                  </>
                )}
              </div>
              <div style={{ fontWeight: 600 }}>${Number(purchase.price).toFixed(2)}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
