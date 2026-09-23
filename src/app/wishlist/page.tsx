import { prisma } from "@/lib/prisma";

export default async function WishlistPage() {
  const user = await prisma.user.findFirst();
  const items = user
    ? await prisma.desiredItem.findMany({
        where: { userId: user.id, pauseStatus: "saved_for_later" },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="page">
      <span className="page__eyebrow">Parked for now</span>
      <h1>Wishlist</h1>

      {items.length === 0 ? (
        <p className="page__lede section">Nothing saved for later yet.</p>
      ) : (
        <div className="section">
          {items.map((item) => (
            <div key={item.id} className="item-row">
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.itemName ?? "Item"} className="item-row__thumb" />
              )}
              <span className="item-row__title" style={{ flex: 1 }}>
                {item.itemName}
              </span>
              {item.price && <span className="item-row__price">${Number(item.price).toFixed(2)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
