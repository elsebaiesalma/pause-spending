// Deletes ONLY the rows scripts/seedMockWardrobe.ts created - every query
// and delete in this file is filtered by source: "seed", which real data
// never has (it's null on every purchase/wardrobe item created by the real
// Gmail-sync or manual-entry paths - see prisma/schema.prisma). There is no
// broader delete anywhere in this file: it can't drop a real purchase or
// wardrobe item no matter how it's invoked.
//
// Defaults to a dry run that only reports what it would delete. Pass
// --confirm to actually delete.
//
// Usage:
//   npx tsx scripts/deleteSeededMockWardrobe.ts            (dry run, reports only)
//   npx tsx scripts/deleteSeededMockWardrobe.ts --confirm  (actually deletes)
import { prisma } from "@/lib/prisma";

const SOURCE = "seed";
const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const [wardrobeItems, purchases] = await Promise.all([
    prisma.wardrobeItem.findMany({ where: { source: SOURCE }, select: { id: true, itemName: true } }),
    prisma.purchase.findMany({ where: { source: SOURCE }, select: { id: true, itemName: true } }),
  ]);

  console.log(`Found ${wardrobeItems.length} seeded wardrobe item(s) and ${purchases.length} seeded purchase(s).`);

  if (!CONFIRM) {
    console.log("Dry run only (no rows deleted). Re-run with --confirm to actually delete these rows:");
    for (const item of wardrobeItems) console.log(`  wardrobe_item: ${item.itemName}`);
    for (const purchase of purchases) console.log(`  purchase: ${purchase.itemName}`);
    return;
  }

  const deletedWardrobeItems = await prisma.wardrobeItem.deleteMany({ where: { source: SOURCE } });
  const deletedPurchases = await prisma.purchase.deleteMany({ where: { source: SOURCE } });

  console.log(
    `Deleted ${deletedWardrobeItems.count} seeded wardrobe item(s) and ${deletedPurchases.count} seeded purchase(s).`
  );

  const remaining = await prisma.wardrobeItem.count({ where: { source: SOURCE } });
  if (remaining > 0) {
    throw new Error(`${remaining} seeded wardrobe item(s) still remain after delete - investigate before re-running.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
