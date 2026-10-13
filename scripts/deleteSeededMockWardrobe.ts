// Deletes ONLY the mock rows scripts/seedMockWardrobe.ts created (and the ones
// older versions of it created): every query and delete goes through
// src/lib/mockWardrobeDb.ts, which filters by source: "seed". Real Gmail-synced
// and hand-added rows have no source, so they cannot match. It also refuses to
// run if a real wardrobe item was ever made from a seed purchase, since deleting
// the purchase would cascade to it.
//
// A look left with no pieces after the delete is removed too, for the affected
// accounts only.
//
// Defaults to a dry run that only reports what it would delete. Pass --confirm
// to actually delete.
//
// Usage:
//   npx tsx scripts/deleteSeededMockWardrobe.ts            (dry run, reports only)
//   npx tsx scripts/deleteSeededMockWardrobe.ts --confirm  (actually deletes)
import { prisma } from "@/lib/prisma";
import { deleteSeededMockWardrobe } from "@/lib/mockWardrobeDb";

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const summary = await deleteSeededMockWardrobe({ confirm: CONFIRM });
  console.log(`Found ${summary.wardrobeItems} seeded wardrobe item(s) and ${summary.purchases} seeded purchase(s).`);

  if (!CONFIRM) {
    console.log("Dry run only (no rows deleted). Re-run with --confirm to actually delete them.");
    return;
  }
  console.log(
    `Deleted ${summary.wardrobeItems} seeded wardrobe item(s) and ${summary.purchases} seeded purchase(s)` +
      (summary.looksRemoved > 0 ? `, and ${summary.looksRemoved} look(s) left empty.` : ".")
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
