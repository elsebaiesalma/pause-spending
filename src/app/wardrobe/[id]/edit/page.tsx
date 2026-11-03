import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import { PageHeader } from "@/components/PageHeader";

export default async function EditWardrobeItemPage({
  params,
}: PageProps<"/wardrobe/[id]/edit">) {
  const userId = await requireUserIdOrRedirect();
  const { id } = await params;
  const item = await prisma.wardrobeItem.findFirst({ where: { id, userId } });
  if (!item) {
    notFound();
  }

  return (
    <div className="page">
      <PageHeader back={{ href: "/wardrobe", label: "Closet" }} title="Edit piece" subtitle={item.itemName} />
      <form action={`/api/wardrobe/${item.id}/update`} method="POST">
        <label htmlFor="itemName">Name</label>
        <input id="itemName" name="itemName" defaultValue={item.itemName} required />
        <label htmlFor="category">Category</label>
        <input id="category" name="category" defaultValue={item.category ?? ""} placeholder="Category" />
        <label htmlFor="colorName">Color</label>
        <input id="colorName" name="colorName" defaultValue={item.colorName ?? ""} placeholder="e.g. Espresso" />
        <label htmlFor="colorFamily">Color family</label>
        <select id="colorFamily" name="colorFamily" defaultValue={item.colorFamily ?? ""}>
          <option value="">Unset</option>
          {COLOR_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {family}
            </option>
          ))}
        </select>
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
