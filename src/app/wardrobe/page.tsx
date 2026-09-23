import { prisma } from "@/lib/prisma";
import { listActiveWardrobeItems } from "@/lib/wardrobe";

export default async function WardrobePage() {
  const user = await prisma.user.findFirst();
  const items = user ? await listActiveWardrobeItems(user.id) : [];

  return (
    <div className="page page--wide">
      <span className="page__eyebrow">What you own</span>
      <h1>Wardrobe</h1>

      <h2>Add an item</h2>
      <form action="/api/wardrobe" method="POST">
        <input name="itemName" placeholder="Item name (required)" required />
        <input name="category" placeholder="Category, e.g. tops" />
        <input name="primaryColor" placeholder="Color" />
        <input name="styleTags" placeholder="Style tags (comma separated)" />
        <input name="useCaseTags" placeholder="Use-case tags (comma separated)" />
        <label htmlFor="ownedSince">Owned since</label>
        <input id="ownedSince" name="ownedSince" type="date" />
        <button type="submit">Add to wardrobe</button>
      </form>

      <h2>Active items ({items.length})</h2>
      {items.length === 0 ? (
        <p className="page__lede">No wardrobe items yet.</p>
      ) : (
        <div>
          {items.map((item) => (
            <div key={item.id} className="item-row">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.itemName} className="item-row__thumb" />
              ) : (
                <div className="item-row__thumb" />
              )}
              <div className="item-row__body">
                <div className="item-row__title">
                  {item.itemName}
                  {!item.sourcePurchaseId && <span className="page__lede"> - manually added</span>}
                </div>
                <div className="item-row__meta">
                  {item.category ?? "uncategorized"}
                  {item.primaryColor ? ` · ${item.primaryColor}` : ""}
                  {item.styleTags.length > 0 ? ` · ${item.styleTags.join(", ")}` : ""}
                  {item.useCaseTags.length > 0 ? ` · ${item.useCaseTags.join(", ")}` : ""}
                </div>
              </div>
              <div className="row">
                <a href={`/wardrobe/${item.id}/edit`} className="btn-quiet">
                  Edit
                </a>
                <form action={`/api/wardrobe/${item.id}/return`} method="POST">
                  <button type="submit">Mark returned</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
