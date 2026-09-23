import { prisma } from "@/lib/prisma";

export default async function ConfirmDesiredItemPage({
  params,
}: PageProps<"/desired-items/[id]/confirm">) {
  const { id } = await params;
  const item = await prisma.desiredItem.findUniqueOrThrow({ where: { id } });
  const extractionFailed = !item.itemName;

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Confirm this item</h1>

      {extractionFailed ? (
        <p>
          We couldn&apos;t automatically identify the item{" "}
          {item.sourceType === "url" ? "from that link" : "from that screenshot"}. Please fill in
          the details yourself.
        </p>
      ) : (
        <p>Here&apos;s what we found - correct anything that&apos;s wrong before continuing.</p>
      )}

      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.itemName ?? "Item"}
          width={120}
          height={120}
          style={{ objectFit: "cover", borderRadius: 6, marginBottom: "1rem" }}
        />
      )}

      <form
        action={`/api/desired-items/${item.id}/confirm`}
        method="POST"
        style={{ display: "grid", gap: "0.5rem" }}
      >
        <input name="itemName" defaultValue={item.itemName ?? ""} placeholder="Item name" required />
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item.price ? Number(item.price) : ""}
          placeholder="Price"
        />
        <input name="imageUrl" defaultValue={item.imageUrl ?? ""} placeholder="Image URL" />
        <button type="submit">Confirm</button>
      </form>

      <p>
        <a href="/desired-items/new">Cancel, start over</a>
      </p>
    </main>
  );
}
