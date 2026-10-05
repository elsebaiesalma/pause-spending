import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
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
    vi.mocked(auth).mockReset();
    await prisma.purchase.deleteMany({ where: { id: { in: createdPurchaseIds } } });
    createdPurchaseIds.length = 0;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest(), await ctxFor("some-id"));

    expect(response.status).toBe(401);
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
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest(), await ctxFor(purchase.id));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const found = await prisma.purchase.findUnique({ where: { id: purchase.id } });
    expect(found).toBeNull();
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("returns 404 and never deletes another user's review-queue purchase", async () => {
      fixture = await createTwoTenantFixture();
      const reviewPurchase = await prisma.purchase.create({
        data: {
          userId: fixture.userB.user.id,
          merchant: "Unknown Retailer",
          orderDate: new Date("2026-02-01"),
          itemName: "Order from Unknown Retailer",
          price: "0",
          category: "unknown",
          status: "needs_review",
        },
      });
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const response = await POST(buildRequest(), await ctxFor(reviewPurchase.id));

      expect(response.status).toBe(404);

      const stillThere = await prisma.purchase.findUnique({ where: { id: reviewPurchase.id } });
      expect(stillThere).not.toBeNull();
    });
  });
});
