import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { PieceForm } from "@/components/PieceForm";

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
      <PieceForm
        mode="edit"
        action={`/api/wardrobe/${item.id}/update`}
        cancelHref="/wardrobe"
        submitLabel="Save"
        initial={{
          itemName: item.itemName,
          category: (item.category ?? "").trim().toLowerCase(),
          colorFamily: item.colorFamily ?? "",
          colorName: item.colorName ?? "",
          styleTags: item.styleTags,
          useCaseTags: item.useCaseTags,
          ownedSince: item.ownedSince ? item.ownedSince.toISOString().slice(0, 10) : "",
        }}
      />
    </div>
  );
}
