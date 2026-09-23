import { prisma } from "@/lib/prisma";

export default async function ConfirmDesiredItemPage({
  params,
}: PageProps<"/desired-items/[id]/confirm">) {
  const { id } = await params;
  const item = await prisma.desiredItem.findUniqueOrThrow({ where: { id } });
  const extractionFailed = !item.itemName;

  return (
    <div className="page">
      <span className="page__eyebrow">One more look</span>
      <h1>Confirm this item</h1>

      {extractionFailed ? (
        <p className="page__lede">
          We couldn&apos;t automatically identify the item{" "}
          {item.sourceType === "url" ? "from that link" : "from that screenshot"}. Please fill in the
          details yourself.
        </p>
      ) : (
        <p className="page__lede">Here&apos;s what we found - correct anything that&apos;s wrong before continuing.</p>
      )}

      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.itemName ?? "Item"}
          width={120}
          height={120}
          style={{ objectFit: "cover", marginTop: "1.25rem", marginBottom: "0.5rem" }}
        />
      )}

      <form action={`/api/desired-items/${item.id}/confirm`} method="POST" className="section">
        <label htmlFor="itemName">Item name</label>
        <input id="itemName" name="itemName" defaultValue={item.itemName ?? ""} placeholder="Item name" required />
        <label htmlFor="price">Price</label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item.price ? Number(item.price) : ""}
          placeholder="Price"
        />
        <label htmlFor="imageUrl">Image URL</label>
        <input id="imageUrl" name="imageUrl" defaultValue={item.imageUrl ?? ""} placeholder="Image URL" />
        <label htmlFor="category">Category</label>
        <input id="category" name="category" defaultValue={item.category ?? ""} placeholder="Category, e.g. tops" />
        <label htmlFor="primaryColor">Color</label>
        <input id="primaryColor" name="primaryColor" defaultValue={item.primaryColor ?? ""} placeholder="Color" />
        <label htmlFor="styleTags">Style tags</label>
        <input
          id="styleTags"
          name="styleTags"
          defaultValue={item.styleTags.join(", ")}
          placeholder="Style tags (comma separated)"
        />
        <button type="submit" className="btn-primary">
          Confirm
        </button>
      </form>

      <p className="section">
        <a href="/desired-items/new" className="btn-quiet">
          Cancel, start over
        </a>
      </p>
    </div>
  );
}
