import { afterEach, describe, expect, it, vi } from "vitest";

// Tagging behavior itself is covered by tagWardrobeItem.test.ts - here it's
// just a pass-through so these CRUD tests don't make real LLM calls.
vi.mock("@/lib/tagging/tagWardrobeItem", () => ({
  ensureWardrobeItemTagged: vi.fn(async (item) => item),
}));

import { prisma } from "@/lib/prisma";
import {
  createManualWardrobeItem,
  listActiveWardrobeItems,
  markWardrobeItemReturned,
  seedWardrobeItemFromPurchase,
  updateWardrobeItem,
} from "./wardrobe";

describe("wardrobe service", () => {
  let userId: string;

  const createdPurchaseIds: string[] = [];
  const createdWardrobeItemIds: string[] = [];

  afterEach(async () => {
    await prisma.wardrobeItem.deleteMany({ where: { id: { in: createdWardrobeItemIds } } });
    await prisma.purchase.deleteMany({ where: { id: { in: createdPurchaseIds } } });
    createdPurchaseIds.length = 0;
    createdWardrobeItemIds.length = 0;
  });

  async function makePurchase(overrides: Partial<{ status: string }> = {}) {
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        merchant: "Nike",
        orderDate: new Date("2026-03-01"),
        itemName: "Air Max 90",
        price: "129.99",
        category: "shoes",
        imageUrl: "https://cdn.nike.com/shoe.jpg",
        status: overrides.status ?? "active",
      },
    });
    createdPurchaseIds.push(purchase.id);
    return purchase;
  }

  it("seeds a wardrobe item from an active purchase, carrying over its fields", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const purchase = await makePurchase();

    await seedWardrobeItemFromPurchase(purchase);

    const item = await prisma.wardrobeItem.findFirstOrThrow({
      where: { sourcePurchaseId: purchase.id },
    });
    createdWardrobeItemIds.push(item.id);

    expect(item.itemName).toBe("Air Max 90");
    expect(item.imageUrl).toBe("https://cdn.nike.com/shoe.jpg");
    expect(item.category).toBe("shoes");
    expect(item.status).toBe("active");
    expect(item.ownedSince?.toISOString().slice(0, 10)).toBe("2026-03-01");
  });

  it("does not seed a wardrobe item from a needs_review purchase", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const purchase = await makePurchase({ status: "needs_review" });

    await seedWardrobeItemFromPurchase(purchase);

    const item = await prisma.wardrobeItem.findFirst({
      where: { sourcePurchaseId: purchase.id },
    });
    expect(item).toBeNull();
  });

  it("is idempotent - seeding the same purchase twice does not duplicate", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const purchase = await makePurchase();

    await seedWardrobeItemFromPurchase(purchase);
    await seedWardrobeItemFromPurchase(purchase);

    const items = await prisma.wardrobeItem.findMany({
      where: { sourcePurchaseId: purchase.id },
    });
    createdWardrobeItemIds.push(...items.map((i) => i.id));
    expect(items).toHaveLength(1);
  });

  it("creates a manually-added item with no linked purchase", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    const item = await createManualWardrobeItem({
      userId,
      itemName: "Grandma's Scarf",
      category: "accessories",
      primaryColor: "red",
    });
    createdWardrobeItemIds.push(item.id);

    expect(item.sourcePurchaseId).toBeNull();
    expect(item.itemName).toBe("Grandma's Scarf");
    expect(item.status).toBe("active");
  });

  it("edits any field on an existing wardrobe item", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const item = await createManualWardrobeItem({ userId, itemName: "Untagged Sweater" });
    createdWardrobeItemIds.push(item.id);

    const updated = await updateWardrobeItem(item.id, userId, {
      itemName: "Navy Wool Sweater",
      primaryColor: "navy",
      styleTags: ["business-casual"],
    });

    expect(updated.itemName).toBe("Navy Wool Sweater");
    expect(updated.primaryColor).toBe("navy");
    expect(updated.styleTags).toEqual(["business-casual"]);
  });

  it("marking an item returned excludes it from the active wardrobe but keeps the row and its purchase", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const purchase = await makePurchase();
    await seedWardrobeItemFromPurchase(purchase);
    const item = await prisma.wardrobeItem.findFirstOrThrow({
      where: { sourcePurchaseId: purchase.id },
    });
    createdWardrobeItemIds.push(item.id);

    await markWardrobeItemReturned(item.id, userId);

    const activeItems = await listActiveWardrobeItems(userId);
    expect(activeItems.find((i) => i.id === item.id)).toBeUndefined();

    const stillExists = await prisma.wardrobeItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(stillExists.status).toBe("returned");

    const purchaseStillExists = await prisma.purchase.findUniqueOrThrow({
      where: { id: purchase.id },
    });
    expect(purchaseStillExists.status).toBe("active");
  });

  it("listActiveWardrobeItems only returns active items for the given user", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    const active = await createManualWardrobeItem({ userId, itemName: "Active Item" });
    const returned = await createManualWardrobeItem({ userId, itemName: "Returned Item" });
    createdWardrobeItemIds.push(active.id, returned.id);
    await markWardrobeItemReturned(returned.id, userId);

    const items = await listActiveWardrobeItems(userId);
    const ids = items.map((i) => i.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(returned.id);
  });
});
