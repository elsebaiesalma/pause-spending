import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tagging/tagWardrobeItem", () => ({
  ensureWardrobeItemTagged: vi.fn(async (item) => item),
}));

import { prisma } from "@/lib/prisma";
import { confirmReviewPurchase, discardReviewPurchase } from "./reviewQueue";

describe("confirmReviewPurchase", () => {
  const createdPurchaseIds: string[] = [];
  const createdWardrobeItemIds: string[] = [];

  afterEach(async () => {
    await prisma.wardrobeItem.deleteMany({ where: { sourcePurchaseId: { in: createdPurchaseIds } } });
    await prisma.purchase.deleteMany({ where: { id: { in: createdPurchaseIds } } });
    createdPurchaseIds.length = 0;
    createdWardrobeItemIds.length = 0;
  });

  async function makeReviewPurchase(userId: string) {
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        merchant: "Unknown Retailer",
        orderDate: new Date("2026-02-01"),
        itemName: "Order from Unknown Retailer",
        price: "0",
        category: "unknown",
        status: "needs_review",
      },
    });
    createdPurchaseIds.push(purchase.id);
    return purchase;
  }

  it("moves the purchase to active with the corrected fields and seeds a wardrobe item", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const purchase = await makeReviewPurchase(userId);

    const confirmed = await confirmReviewPurchase(purchase.id, userId, {
      itemName: "Navy Wool Coat",
      price: 189.99,
      category: "outerwear",
    });

    expect(confirmed.status).toBe("active");
    expect(confirmed.itemName).toBe("Navy Wool Coat");
    expect(Number(confirmed.price)).toBeCloseTo(189.99);
    expect(confirmed.userEdited).toBe(true);

    const wardrobeItem = await prisma.wardrobeItem.findFirst({
      where: { sourcePurchaseId: purchase.id },
    });
    expect(wardrobeItem).not.toBeNull();
    expect(wardrobeItem?.itemName).toBe("Navy Wool Coat");
  });

  it("never confirms a purchase belonging to a different user", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const purchase = await makeReviewPurchase(userId);

    await expect(
      confirmReviewPurchase(purchase.id, "not-the-real-user-id", {
        itemName: "x",
        price: 1,
        category: "tops",
      })
    ).rejects.toThrow();

    const unchanged = await prisma.purchase.findUniqueOrThrow({ where: { id: purchase.id } });
    expect(unchanged.status).toBe("needs_review");
  });
});

describe("discardReviewPurchase", () => {
  const createdPurchaseIds: string[] = [];

  afterEach(async () => {
    await prisma.purchase.deleteMany({ where: { id: { in: createdPurchaseIds } } });
    createdPurchaseIds.length = 0;
  });

  it("deletes a needs_review purchase entirely", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        merchant: "Unknown Retailer",
        orderDate: new Date("2026-02-01"),
        itemName: "Order from Unknown Retailer",
        price: "0",
        category: "unknown",
        status: "needs_review",
      },
    });
    createdPurchaseIds.push(purchase.id);

    await discardReviewPurchase(purchase.id, userId);

    const found = await prisma.purchase.findUnique({ where: { id: purchase.id } });
    expect(found).toBeNull();
  });

  it("never discards an already-active (confirmed) purchase", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        merchant: "Nike",
        orderDate: new Date("2026-02-01"),
        itemName: "Running Shoes",
        price: "80",
        category: "shoes",
        status: "active",
      },
    });
    createdPurchaseIds.push(purchase.id);

    await expect(discardReviewPurchase(purchase.id, userId)).rejects.toThrow();

    const stillThere = await prisma.purchase.findUniqueOrThrow({ where: { id: purchase.id } });
    expect(stillThere.status).toBe("active");
  });
});
