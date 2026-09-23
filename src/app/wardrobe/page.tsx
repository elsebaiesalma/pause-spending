import { prisma } from "@/lib/prisma";
import { listActiveWardrobeItems } from "@/lib/wardrobe";

export default async function WardrobePage() {
  const user = await prisma.user.findFirst();
  const items = user ? await listActiveWardrobeItems(user.id) : [];

  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Wardrobe</h1>
      <p>
        <a href="/">Back to home</a>
      </p>

      <h2>Add an item</h2>
      <form action="/api/wardrobe" method="POST" style={{ display: "grid", gap: "0.5rem", maxWidth: 400 }}>
        <input name="itemName" placeholder="Item name (required)" required />
        <input name="category" placeholder="Category, e.g. tops" />
        <input name="primaryColor" placeholder="Color" />
        <input name="styleTags" placeholder="Style tags (comma separated)" />
        <input name="useCaseTags" placeholder="Use-case tags (comma separated)" />
        <input name="ownedSince" type="date" placeholder="Owned since" />
        <button type="submit">Add to wardrobe</button>
      </form>

      <h2 style={{ marginTop: "2rem" }}>Active items ({items.length})</h2>
      {items.length === 0 ? (
        <p>No wardrobe items yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                borderBottom: "1px solid #ddd",
                padding: "0.75rem 0",
              }}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.itemName}
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
                  <strong>{item.itemName}</strong>
                  {!item.sourcePurchaseId && (
                    <span style={{ color: "#555", fontSize: "0.85rem" }}> (manually added)</span>
                  )}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#555" }}>
                  {item.category ?? "uncategorized"}
                  {item.primaryColor ? ` · ${item.primaryColor}` : ""}
                  {item.styleTags.length > 0 ? ` · ${item.styleTags.join(", ")}` : ""}
                </div>
              </div>
              <a href={`/wardrobe/${item.id}/edit`}>Edit</a>
              <form action={`/api/wardrobe/${item.id}/return`} method="POST">
                <button type="submit">Mark returned</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
