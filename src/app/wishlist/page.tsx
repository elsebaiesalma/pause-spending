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
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Wishlist</h1>
      <p>
        <a href="/">Back to home</a>
      </p>

      {items.length === 0 ? (
        <p>Nothing saved for later yet.</p>
      ) : (
        <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: "1rem" }}>
          {items.map((item) => (
            <li key={item.id} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.itemName ?? "Item"}
                  width={56}
                  height={56}
                  style={{ objectFit: "cover", borderRadius: 6 }}
                />
              )}
              <span>
                {item.itemName}
                {item.price && ` - $${Number(item.price).toFixed(2)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
