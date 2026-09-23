import { prisma } from "@/lib/prisma";

export default async function EditWardrobeItemPage({
  params,
}: PageProps<"/wardrobe/[id]/edit">) {
  const { id } = await params;
  const item = await prisma.wardrobeItem.findUniqueOrThrow({ where: { id } });

  return (
    <div className="page">
      <span className="page__eyebrow">Wardrobe</span>
      <h1>Edit item</h1>
      <form action={`/api/wardrobe/${item.id}/update`} method="POST" className="section">
        <label htmlFor="itemName">Name</label>
        <input id="itemName" name="itemName" defaultValue={item.itemName} required />
        <label htmlFor="category">Category</label>
        <input id="category" name="category" defaultValue={item.category ?? ""} placeholder="Category" />
        <label htmlFor="primaryColor">Color</label>
        <input id="primaryColor" name="primaryColor" defaultValue={item.primaryColor ?? ""} placeholder="Color" />
        <label htmlFor="styleTags">Style tags</label>
        <input
          id="styleTags"
          name="styleTags"
          defaultValue={item.styleTags.join(", ")}
          placeholder="Style tags (comma separated)"
        />
        <label htmlFor="useCaseTags">Use-case tags</label>
        <input
          id="useCaseTags"
          name="useCaseTags"
          defaultValue={item.useCaseTags.join(", ")}
          placeholder="Use-case tags (comma separated)"
        />
        <label htmlFor="ownedSince">Owned since</label>
        <input
          id="ownedSince"
          name="ownedSince"
          type="date"
          defaultValue={item.ownedSince ? item.ownedSince.toISOString().slice(0, 10) : ""}
        />
        <button type="submit" className="btn-primary">
          Save
        </button>
      </form>
      <p className="section">
        <a href="/wardrobe" className="btn-quiet">
          Cancel, back to wardrobe
        </a>
      </p>
    </div>
  );
}
