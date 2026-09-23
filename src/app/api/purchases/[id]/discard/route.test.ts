import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest() {
  return new NextRequest("http://localhost:3000/api/purchases/x/discard", { method: "POST" });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/purchases/[id]/discard", () => {
  const createdPurchaseIds: string[] = [];

  afterEach(async () => {
    await prisma.purchase.deleteMany({ where: { id: { in: createdPurchaseIds } } });
    createdPurchaseIds.length = 0;
  });

  it("deletes the review-queue purchase and redirects to the purchase list", async () => {
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

    const response = await POST(buildRequest(), await ctxFor(purchase.id));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const found = await prisma.purchase.findUnique({ where: { id: purchase.id } });
    expect(found).toBeNull();
  });
});
