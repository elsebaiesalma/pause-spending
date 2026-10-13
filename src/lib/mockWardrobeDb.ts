import { prisma } from "@/lib/prisma";
import { MOCK_SOURCE, buildRows, mockIds, type MockItem } from "@/lib/mockWardrobe";

// Seeding and removing the mock wardrobe. Both only ever touch rows whose
// source is "seed", which real Gmail-synced and hand-added rows never have.

export type SeedSummary = {
  purchasesCreated: number;
  purchasesUpdated: number;
  itemsCreated: number;
  itemsUpdated: number;
  // Image files the data names that are not in public/mock yet.
  missingImages: string[];
  // Seed rows for this user that are not in the data: left over from an older
  // seed (those had random ids). Never touched here; the delete script removes them.
  staleSeedRows: number;
};

// Creates or updates the mock items for one user. Each item has fixed ids
// per user (see mockIds), so running it again updates the same rows instead of adding
// more. With dryRun it reports what it would do and writes nothing.
export async function seedMockWardrobe(options: {
  userId: string;
  items: readonly MockItem[];
  imageExists: (file: string) => boolean;
  dryRun: boolean;
}): Promise<SeedSummary> {
  const { userId, items, imageExists, dryRun } = options;
  const summary: SeedSummary = {
    purchasesCreated: 0,
    purchasesUpdated: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    missingImages: [],
    staleSeedRows: 0,
  };

  const missing = new Set<string>();
  for (const item of items) {
    const rows = buildRows(item, userId, imageExists);
    if (item.image && !rows.imageUrl) missing.add(item.image);

    const [existingPurchase, existingItem] = await Promise.all([
      prisma.purchase.findUnique({ where: { id: rows.purchaseId }, select: { userId: true, source: true } }),
      prisma.wardrobeItem.findUnique({ where: { id: rows.wardrobeItemId }, select: { userId: true, source: true } }),
    ]);
    // An id collision with someone's real row is not going to happen, but if it
    // ever did, overwriting it would be the worst possible outcome.
    for (const existing of [existingPurchase, existingItem]) {
      if (existing && (existing.source !== MOCK_SOURCE || existing.userId !== userId)) {
        throw new Error(`Refusing to overwrite a row that is not this user's seed row (${item.key}).`);
      }
    }

    if (existingPurchase) summary.purchasesUpdated += 1;
    else summary.purchasesCreated += 1;
    if (existingItem) summary.itemsUpdated += 1;
    else summary.itemsCreated += 1;
    if (dryRun) continue;

    await prisma.purchase.upsert({
      where: { id: rows.purchaseId },
      create: { id: rows.purchaseId, ...rows.purchase },
      update: rows.purchase,
    });
    // tagsExtractedAt is set once, on create, so tagging is never re-run for
    // mock rows (and never overwritten on an update).
    await prisma.wardrobeItem.upsert({
      where: { id: rows.wardrobeItemId },
      create: { id: rows.wardrobeItemId, ...rows.wardrobeItem, tagsExtractedAt: new Date() },
      update: rows.wardrobeItem,
    });
  }

  summary.missingImages = [...missing].sort();

  const expected = new Set(items.flatMap((item) => Object.values(mockIds(item.key, userId))));
  const seedRows = await Promise.all([
    prisma.purchase.findMany({ where: { userId, source: MOCK_SOURCE }, select: { id: true } }),
    prisma.wardrobeItem.findMany({ where: { userId, source: MOCK_SOURCE }, select: { id: true } }),
  ]);
  summary.staleSeedRows = seedRows.flat().filter((row) => !expected.has(row.id)).length;

  return summary;
}

export type DeleteSummary = {
  wardrobeItems: number;
  purchases: number;
  looksRemoved: number;
};

export class UnsafeDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeDeleteError";
  }
}

// Deletes the mock rows and nothing else: every query is filtered by
// source "seed" (and by user when one is given). Before deleting it checks the
// one way this could reach a real row: deleting a purchase cascades to the
// wardrobe items made from it, so if a real (non-seed) wardrobe item ever
// pointed at a seed purchase, it refuses. Looks left with no pieces are
// removed afterwards, for the affected users only.
export async function deleteSeededMockWardrobe(options: { confirm: boolean; userId?: string }): Promise<DeleteSummary> {
  const scope = options.userId ? { userId: options.userId } : {};
  const [items, purchases] = await Promise.all([
    prisma.wardrobeItem.findMany({ where: { source: MOCK_SOURCE, ...scope }, select: { id: true, userId: true } }),
    prisma.purchase.findMany({ where: { source: MOCK_SOURCE, ...scope }, select: { id: true, userId: true } }),
  ]);

  const summary: DeleteSummary = { wardrobeItems: items.length, purchases: purchases.length, looksRemoved: 0 };

  const strays = await prisma.wardrobeItem.count({
    where: {
      sourcePurchaseId: { in: purchases.map((p) => p.id) },
      OR: [{ source: null }, { source: { not: MOCK_SOURCE } }],
    },
  });
  if (strays > 0) {
    throw new UnsafeDeleteError(
      `${strays} real wardrobe item(s) were made from a seed purchase; deleting would remove them too. Nothing was deleted.`
    );
  }

  if (!options.confirm) return summary;

  await prisma.wardrobeItem.deleteMany({ where: { source: MOCK_SOURCE, ...scope } });
  await prisma.purchase.deleteMany({ where: { source: MOCK_SOURCE, ...scope } });

  const remaining =
    (await prisma.wardrobeItem.count({ where: { source: MOCK_SOURCE, ...scope } })) +
    (await prisma.purchase.count({ where: { source: MOCK_SOURCE, ...scope } }));
  if (remaining > 0) throw new Error(`${remaining} seed row(s) still remain after the delete; investigate before re-running.`);

  // A look built only from seed pieces has nothing left on it now.
  const owners = [...new Set([...items, ...purchases].map((row) => row.userId))];
  if (owners.length > 0) {
    const removed = await prisma.look.deleteMany({ where: { userId: { in: owners }, items: { none: {} } } });
    summary.looksRemoved = removed.count;
  }
  return summary;
}
