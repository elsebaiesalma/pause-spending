import { prisma } from "@/lib/prisma";

export default async function EditWardrobeItemPage({
  params,
}: PageProps<"/wardrobe/[id]/edit">) {
  const { id } = await params;
  const item = await prisma.wardrobeItem.findUniqueOrThrow({ where: { id } });

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Edit item</h1>
      <form
        action={`/api/wardrobe/${item.id}/update`}
        method="POST"
        style={{ display: "grid", gap: "0.5rem" }}
      >
        <input name="itemName" defaultValue={item.itemName} required />
        <input name="category" defaultValue={item.category ?? ""} placeholder="Category" />
        <input name="primaryColor" defaultValue={item.primaryColor ?? ""} placeholder="Color" />
        <input
          name="styleTags"
          defaultValue={item.styleTags.join(", ")}
          placeholder="Style tags (comma separated)"
        />
        <input
          name="useCaseTags"
          defaultValue={item.useCaseTags.join(", ")}
          placeholder="Use-case tags (comma separated)"
        />
        <input
          name="ownedSince"
          type="date"
          defaultValue={item.ownedSince ? item.ownedSince.toISOString().slice(0, 10) : ""}
        />
        <button type="submit">Save</button>
      </form>
      <p>
        <a href="/wardrobe">Cancel, back to wardrobe</a>
      </p>
    </main>
  );
}
