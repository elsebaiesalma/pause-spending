import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parseMockWardrobe } from "@/lib/mockWardrobe";
import { UnsafeDeleteError, deleteSeededMockWardrobe, seedMockWardrobe } from "@/lib/mockWardrobeDb";

const items = parseMockWardrobe(JSON.parse(readFileSync(path.join("data", "mock-wardrobe.json"), "utf8")));
const SLOW = 180_000;
const everyImageExists = () => true;

describe("seeding and removing the mock wardrobe", () => {
  const userIds: string[] = [];

  async function newUser(label: string) {
    const user = await prisma.user.create({ data: { email: `mock-${label}-${Date.now()}-${userIds.length}@pause-spending.test` } });
    userIds.push(user.id);
    return user;
  }

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  });

  it(
    "a dry run writes nothing; a real run creates every item once; re-running updates instead of duplicating",
    async () => {
      const user = await newUser("seed");

      const dry = await seedMockWardrobe({ userId: user.id, items, imageExists: everyImageExists, dryRun: true });
      expect(dry.itemsCreated).toBe(items.length);
      expect(await prisma.wardrobeItem.count({ where: { userId: user.id } })).toBe(0);

      const first = await seedMockWardrobe({ userId: user.id, items, imageExists: everyImageExists, dryRun: false });
      expect([first.itemsCreated, first.itemsUpdated, first.purchasesCreated]).toEqual([items.length, 0, items.length]);
      expect(await prisma.wardrobeItem.count({ where: { userId: user.id, source: "seed" } })).toBe(items.length);
      expect(await prisma.purchase.count({ where: { userId: user.id, source: "seed" } })).toBe(items.length);

      const second = await seedMockWardrobe({ userId: user.id, items, imageExists: everyImageExists, dryRun: false });
      expect([second.itemsCreated, second.itemsUpdated]).toEqual([0, items.length]);
      expect(await prisma.wardrobeItem.count({ where: { userId: user.id } })).toBe(items.length);
      expect(await prisma.purchase.count({ where: { userId: user.id } })).toBe(items.length);
    },
    SLOW
  );

  it(
    "updates a changed row in place, and keeps the messy cases (no price, needs review, no image)",
    async () => {
      const user = await newUser("update");
      await seedMockWardrobe({ userId: user.id, items, imageExists: everyImageExists, dryRun: false });

      const priced = items.find((i) => i.price !== null)!;
      await seedMockWardrobe({
        userId: user.id,
        items: items.map((i) => (i.key === priced.key ? { ...i, price: 999 } : i)),
        imageExists: () => false,
        dryRun: false,
      });

      const purchase = await prisma.purchase.findFirstOrThrow({
        where: { userId: user.id, itemName: `${priced.brand} ${priced.name}` },
      });
      expect(Number(purchase.price)).toBe(999);
      // With no image files present, every item is imageless (the placeholder).
      expect(await prisma.wardrobeItem.count({ where: { userId: user.id, imageUrl: { not: null } } })).toBe(0);

      expect(await prisma.purchase.count({ where: { userId: user.id, price: null, status: "needs_review" } })).toBe(1);
      expect(await prisma.wardrobeItem.count({ where: { userId: user.id, status: "needs_review" } })).toBe(2);
    },
    SLOW
  );

  it(
    "the delete removes the seed rows and nothing else: real rows, other users and their seeds are untouched",
    async () => {
      const user = await newUser("delete");
      const other = await newUser("other");
      await seedMockWardrobe({ userId: user.id, items, imageExists: everyImageExists, dryRun: false });
      await seedMockWardrobe({ userId: other.id, items: items.slice(0, 3), imageExists: everyImageExists, dryRun: false });

      // A real (no source) purchase and wardrobe item, and one added by hand.
      const realPurchase = await prisma.purchase.create({
        data: { userId: user.id, merchant: "Real Shop", orderDate: new Date("2026-03-01"), itemName: "Real Coat", price: "100", category: "outerwear" },
      });
      const realItem = await prisma.wardrobeItem.create({
        data: { userId: user.id, sourcePurchaseId: realPurchase.id, itemName: "Real Coat", category: "outerwear" },
      });
      const byHand = await prisma.wardrobeItem.create({ data: { userId: user.id, itemName: "Hand Added", category: "tops" } });

      // A look built from a seed piece and a real one, and one from seed pieces only.
      const seedPiece = await prisma.wardrobeItem.findFirstOrThrow({ where: { userId: user.id, source: "seed" } });
      const seedPiece2 = await prisma.wardrobeItem.findFirstOrThrow({ where: { userId: user.id, source: "seed", id: { not: seedPiece.id } } });
      const placement = (wardrobeItemId: string) => ({ lookId: "", userId: user.id, wardrobeItemId, x: 0.1, y: 0.1, scale: 0.3, zOrder: 0 });
      const mixedLook = await prisma.look.create({ data: { userId: user.id, name: "Mixed" } });
      await prisma.lookItem.createMany({
        data: [
          { ...placement(seedPiece.id), lookId: mixedLook.id },
          { ...placement(realItem.id), lookId: mixedLook.id, zOrder: 1 },
        ],
      });
      const seedOnlyLook = await prisma.look.create({ data: { userId: user.id, name: "Seed only" } });
      await prisma.lookItem.createMany({ data: [{ ...placement(seedPiece2.id), lookId: seedOnlyLook.id }] });

      // Dry run first: reports, deletes nothing.
      const dry = await deleteSeededMockWardrobe({ confirm: false, userId: user.id });
      expect(dry.wardrobeItems).toBe(items.length);
      expect(await prisma.wardrobeItem.count({ where: { userId: user.id, source: "seed" } })).toBe(items.length);

      const done = await deleteSeededMockWardrobe({ confirm: true, userId: user.id });
      expect([done.wardrobeItems, done.purchases]).toEqual([items.length, items.length]);

      // This user: only the real rows remain.
      expect(await prisma.wardrobeItem.findMany({ where: { userId: user.id }, select: { id: true }, orderBy: { id: "asc" } })).toEqual(
        [{ id: realItem.id }, { id: byHand.id }].sort((a, b) => a.id.localeCompare(b.id))
      );
      expect(await prisma.purchase.findMany({ where: { userId: user.id }, select: { id: true } })).toEqual([{ id: realPurchase.id }]);
      // Looks: the mixed one keeps its real piece, the seed-only one is gone.
      expect((await prisma.lookItem.findMany({ where: { lookId: mixedLook.id } })).map((i) => i.wardrobeItemId)).toEqual([realItem.id]);
      expect(await prisma.look.findUnique({ where: { id: seedOnlyLook.id } })).toBeNull();
      // The other user's seed rows were not in scope.
      expect(await prisma.wardrobeItem.count({ where: { userId: other.id, source: "seed" } })).toBe(3);
    },
    SLOW
  );

  it(
    "refuses to delete if a real wardrobe item was made from a seed purchase",
    async () => {
      const user = await newUser("guard");
      await seedMockWardrobe({ userId: user.id, items: items.slice(0, 2), imageExists: everyImageExists, dryRun: false });
      const seedPurchase = await prisma.purchase.findFirstOrThrow({ where: { userId: user.id, source: "seed" } });
      const real = await prisma.wardrobeItem.create({
        data: { userId: user.id, sourcePurchaseId: seedPurchase.id, itemName: "Real, from a seed purchase", category: "tops" },
      });

      await expect(deleteSeededMockWardrobe({ confirm: true, userId: user.id })).rejects.toBeInstanceOf(UnsafeDeleteError);
      expect(await prisma.wardrobeItem.findUnique({ where: { id: real.id } })).not.toBeNull();
      expect(await prisma.wardrobeItem.count({ where: { userId: user.id, source: "seed" } })).toBe(2);
    },
    SLOW
  );

  it(
    "reports older seed rows (random ids) as stale instead of touching them",
    async () => {
      const user = await newUser("stale");
      await prisma.purchase.create({
        data: { userId: user.id, merchant: "Old", orderDate: new Date("2026-01-01"), itemName: "Old seed", price: "10", category: "tops", source: "seed" },
      });
      const summary = await seedMockWardrobe({ userId: user.id, items: items.slice(0, 2), imageExists: everyImageExists, dryRun: false });
      expect(summary.staleSeedRows).toBe(1);
      expect(await prisma.purchase.count({ where: { userId: user.id, itemName: "Old seed" } })).toBe(1);
    },
    SLOW
  );
});
