// Resolves any wardrobe_items/desired_items row still missing colorFamily,
// via the static lookup table first and an LLM fallback for whatever it
// doesn't cover. Originally ran (for real, on both the main and test
// databases, verified) as a two-phase migration companion:
//   (a) derive colorFamily = 'multi' from secondary_color, preserving the
//       two-tone pair into colorName (e.g. "Brown / Black") in the same
//       step, before prisma/migrations/20260924030000_drop_wardrobe_secondary_color
//       dropped that column for good.
//   (b) static lookup table on colorName; LLM fallback for the rest.
// Step (a) is gone now that secondary_color no longer exists - it can never
// run again. What's left is step (b), kept as a general-purpose resolver
// for any row that ends up with colorFamily = null in the future (e.g. a
// row created with only colorName set and no family attached at write time).
//
// Usage: npx tsx scripts/backfillColorFamily.ts [--dry-run]
import { prisma } from "@/lib/prisma";
import { lookupColorFamily, classifyColorFamilyByLLM } from "@/lib/colorFamily";

const DRY_RUN = process.argv.includes("--dry-run");

type Tally = {
  total: number;
  viaLookup: number;
  viaLLM: number;
  unresolved: number;
};

async function backfillWardrobeItems(): Promise<Tally> {
  const tally: Tally = { total: 0, viaLookup: 0, viaLLM: 0, unresolved: 0 };

  const items = await prisma.wardrobeItem.findMany({
    where: { colorFamily: null },
    select: { id: true, colorName: true },
  });
  tally.total = items.length;

  for (const item of items) {
    if (!item.colorName) {
      tally.unresolved += 1;
      continue;
    }
    const looked = lookupColorFamily(item.colorName);
    if (looked) {
      tally.viaLookup += 1;
      if (!DRY_RUN) {
        await prisma.wardrobeItem.update({ where: { id: item.id }, data: { colorFamily: looked } });
      }
      continue;
    }
    if (DRY_RUN) {
      // Don't spend real API calls during a dry run - just flag it would need one.
      tally.viaLLM += 1;
      continue;
    }
    const classified = await classifyColorFamilyByLLM(item.colorName);
    if (classified) {
      tally.viaLLM += 1;
      await prisma.wardrobeItem.update({ where: { id: item.id }, data: { colorFamily: classified } });
    } else {
      tally.unresolved += 1;
    }
  }

  return tally;
}

async function backfillDesiredItems(): Promise<Tally> {
  const tally: Tally = { total: 0, viaLookup: 0, viaLLM: 0, unresolved: 0 };

  const items = await prisma.desiredItem.findMany({
    where: { colorFamily: null },
    select: { id: true, colorName: true },
  });
  tally.total = items.length;

  for (const item of items) {
    if (!item.colorName) {
      tally.unresolved += 1;
      continue;
    }
    const looked = lookupColorFamily(item.colorName);
    if (looked) {
      tally.viaLookup += 1;
      if (!DRY_RUN) {
        await prisma.desiredItem.update({ where: { id: item.id }, data: { colorFamily: looked } });
      }
      continue;
    }
    if (DRY_RUN) {
      tally.viaLLM += 1;
      continue;
    }
    const classified = await classifyColorFamilyByLLM(item.colorName);
    if (classified) {
      tally.viaLLM += 1;
      await prisma.desiredItem.update({ where: { id: item.id }, data: { colorFamily: classified } });
    } else {
      tally.unresolved += 1;
    }
  }

  return tally;
}

async function main() {
  console.log(DRY_RUN ? "Running in --dry-run mode (no writes)." : "Running for real - writing colorFamily.");

  const wardrobeResult = await backfillWardrobeItems();
  console.log("WardrobeItem (rows that started with colorFamily = null):", wardrobeResult);

  const desiredResult = await backfillDesiredItems();
  console.log("DesiredItem (rows that started with colorFamily = null):", desiredResult);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
