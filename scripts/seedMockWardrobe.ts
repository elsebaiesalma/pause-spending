// Loads the mock wardrobe from data/mock-wardrobe.json onto your account, every
// row tagged source: "seed" so scripts/deleteSeededMockWardrobe.ts can find and
// remove exactly these rows and nothing else. Each item has fixed ids derived
// from its "key" and your account, so running this again UPDATES the same rows instead of adding
// more (for example after you add images to public/mock/).
//
// Each item becomes a Purchase (carrying the brand and price, as real synced
// items do) plus a WardrobeItem. An image is linked only if its file exists in
// public/mock/ (see the README there); otherwise the item shows the designed
// placeholder until you add the file and re-run.
//
// It defaults to a dry run that only reports. Pass --confirm to write.
//
// Usage:
//   npx tsx scripts/seedMockWardrobe.ts                          (dry run)
//   npx tsx scripts/seedMockWardrobe.ts --confirm                (write)
//   npx tsx scripts/seedMockWardrobe.ts --confirm --email=you@example.com
//
// Which account: your only real account, or the one named with --email (needed
// if there is more than one). Accounts ending in .test are ignored.
//
// Seeds from an older version of this script have random ids, so they are NOT
// updated by this one. Remove them first:
//   npx tsx scripts/deleteSeededMockWardrobe.ts --confirm
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parseMockWardrobe } from "@/lib/mockWardrobe";
import { seedMockWardrobe } from "@/lib/mockWardrobeDb";

const CONFIRM = process.argv.includes("--confirm");
const emailArg = process.argv.find((arg) => arg.startsWith("--email="))?.slice("--email=".length);

async function pickUser() {
  if (emailArg) {
    const user = await prisma.user.findUnique({ where: { email: emailArg } });
    if (!user) throw new Error(`No account with the email ${emailArg}.`);
    return user;
  }
  const users = await prisma.user.findMany({ where: { NOT: { email: { endsWith: ".test" } } }, orderBy: { createdAt: "asc" } });
  if (users.length !== 1) {
    throw new Error(
      `Found ${users.length} real accounts (${users.map((u) => u.email).join(", ") || "none"}). Pass --email=<address> to choose one.`
    );
  }
  return users[0];
}

async function main() {
  const items = parseMockWardrobe(JSON.parse(readFileSync(path.join("data", "mock-wardrobe.json"), "utf8")));
  const user = await pickUser();
  const imageExists = (file: string) => existsSync(path.join("public", "mock", file));

  console.log(`${CONFIRM ? "Seeding" : "Dry run:"} ${items.length} mock items for ${user.email} (${user.id})`);
  const summary = await seedMockWardrobe({ userId: user.id, items, imageExists, dryRun: !CONFIRM });

  console.log(
    `  purchases: ${summary.purchasesCreated} to create, ${summary.purchasesUpdated} to update\n` +
      `  wardrobe items: ${summary.itemsCreated} to create, ${summary.itemsUpdated} to update`
  );
  if (summary.missingImages.length > 0) {
    console.log(`  images not in public/mock yet (those items show the placeholder): ${summary.missingImages.join(", ")}`);
  }
  if (summary.staleSeedRows > 0) {
    console.log(
      `  Note: ${summary.staleSeedRows} older seed row(s) are not from this data and were left alone.\n` +
        `  Remove them first with: npx tsx scripts/deleteSeededMockWardrobe.ts --confirm`
    );
  }
  if (!CONFIRM) console.log("Nothing was written. Re-run with --confirm to write.");
  else console.log("Reminder: GMAIL_SYNC_PAUSED should be true in .env while mock data is loaded.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
