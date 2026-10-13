// Re-points the image of EXISTING seeded rows (source: "seed", and only rows
// that already have an image) at the Unsplash garment photo for their
// category. Rows with no image stay imageless so they keep showing the
// placeholder card. Every query is filtered by source: "seed", which real
// data never has, and only image_url is written.
//
// Usage:
//   npx tsx scripts/pointSeedImagesAtUnsplash.ts            (dry run, reports only)
//   npx tsx scripts/pointSeedImagesAtUnsplash.ts --confirm  (actually updates)
import { prisma } from "@/lib/prisma";
import { seedImageUrlFor } from "@/lib/seedWardrobeImages";

const SOURCE = "seed";
const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const [wardrobeItems, purchases] = await Promise.all([
    prisma.wardrobeItem.findMany({
      where: { source: SOURCE, imageUrl: { not: null } },
      select: { id: true, itemName: true, category: true, imageUrl: true },
    }),
    prisma.purchase.findMany({
      where: { source: SOURCE, imageUrl: { not: null } },
      select: { id: true, itemName: true, category: true, imageUrl: true },
    }),
  ]);

  const plan = (rows: typeof wardrobeItems) =>
    rows.flatMap((row) => {
      const next = seedImageUrlFor(row.category);
      return next && next !== row.imageUrl ? [{ ...row, next }] : [];
    });
  const wardrobePlan = plan(wardrobeItems);
  const purchasePlan = plan(purchases);

  console.log(
    `Seeded rows with an image: ${wardrobeItems.length} wardrobe item(s), ${purchases.length} purchase(s). ` +
      `To change: ${wardrobePlan.length} wardrobe item(s), ${purchasePlan.length} purchase(s).`
  );

  if (!CONFIRM) {
    console.log("Dry run only (nothing written). Re-run with --confirm to apply:");
    for (const row of wardrobePlan) console.log(`  wardrobe_item [${row.category}] ${row.itemName}`);
    return;
  }

  for (const row of wardrobePlan) {
    await prisma.wardrobeItem.update({ where: { id: row.id }, data: { imageUrl: row.next } });
  }
  for (const row of purchasePlan) {
    await prisma.purchase.update({ where: { id: row.id }, data: { imageUrl: row.next } });
  }
  console.log(`Updated ${wardrobePlan.length} wardrobe item(s) and ${purchasePlan.length} purchase(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
