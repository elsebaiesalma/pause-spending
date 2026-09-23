import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/tagging/tagWardrobeItem", () => ({
  ensureWardrobeItemTagged: vi.fn(async (item) => item),
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest("http://localhost:3000/api/purchases/x/confirm", { method: "POST", body: form });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/purchases/[id]/confirm", () => {
  const createdPurchaseIds: string[] = [];

  afterEach(async () => {
    await prisma.wardrobeItem.deleteMany({ where: { sourcePurchaseId: { in: createdPurchaseIds } } });
    await prisma.purchase.deleteMany({ where: { id: { in: createdPurchaseIds } } });
    createdPurchaseIds.length = 0;
  });

  async function makeReviewPurchase() {
    const user = await prisma.user.findFirstOrThrow();
    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
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

  it("confirms with corrected fields and redirects to the purchase list", async () => {
    const purchase = await makeReviewPurchase();

    const response = await POST(
      buildRequest({ itemName: "Navy Wool Coat", price: "189.99", category: "outerwear" }),
      await ctxFor(purchase.id)
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const updated = await prisma.purchase.findUniqueOrThrow({ where: { id: purchase.id } });
    expect(updated.status).toBe("active");
    expect(updated.itemName).toBe("Navy Wool Coat");
  });

  it("rejects confirmation missing required fields", async () => {
    const purchase = await makeReviewPurchase();

    const response = await POST(buildRequest({ itemName: "", price: "", category: "" }), await ctxFor(purchase.id));

    expect(response.status).toBe(400);
    const unchanged = await prisma.purchase.findUniqueOrThrow({ where: { id: purchase.id } });
    expect(unchanged.status).toBe("needs_review");
  });

  it("rejects a Confirm click that submits the pre-filled placeholder defaults unedited", async () => {
    const purchase = await makeReviewPurchase();

    // Exactly what the review-queue form's own defaultValues are - i.e.
    // the user clicked Confirm without correcting anything.
    const response = await POST(
      buildRequest({ itemName: purchase.itemName, price: "0", category: "unknown" }),
      await ctxFor(purchase.id)
    );

    expect(response.status).toBe(400);
    const unchanged = await prisma.purchase.findUniqueOrThrow({ where: { id: purchase.id } });
    expect(unchanged.status).toBe("needs_review");
  });
});
