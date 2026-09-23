import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/oauth/google", async () => {
  const actual = await vi.importActual<typeof import("@/lib/oauth/google")>(
    "@/lib/oauth/google"
  );
  return { ...actual, revokeGoogleToken: vi.fn() };
});

import { revokeGoogleToken } from "@/lib/oauth/google";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const FAKE_STORED_TOKEN = JSON.stringify({
  accessToken: "fake-access",
  refreshToken: "fake-refresh",
  expiresAt: Date.now() + 3_600_000,
});

function buildRequest() {
  return new NextRequest("http://localhost:3000/api/auth/gmail/delete", {
    method: "POST",
  });
}

describe("POST /api/auth/gmail/delete", () => {
  afterEach(async () => {
    vi.mocked(revokeGoogleToken).mockReset();
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.emailConnection.deleteMany({ where: { userId: user.id, provider: "gmail" } });
    }
  });

  it("returns 404 when there is no connection to delete", async () => {
    const response = await POST(buildRequest());

    expect(response.status).toBe(404);
    expect(revokeGoogleToken).not.toHaveBeenCalled();
  });

  it("revokes the token and purges the connection, its purchases, and their wardrobe items", async () => {
    vi.mocked(revokeGoogleToken).mockResolvedValueOnce(undefined);

    const user = await prisma.user.findFirstOrThrow();
    const connection = await prisma.emailConnection.create({
      data: {
        userId: user.id,
        provider: "gmail",
        encryptedToken: encrypt(FAKE_STORED_TOKEN),
        status: "connected",
      },
    });
    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        sourceEmailConnectionId: connection.id,
        merchant: "Test Retailer",
        orderDate: new Date(),
        itemName: "Test Item",
        price: "10",
        category: "clothing",
      },
    });
    const wardrobeItem = await prisma.wardrobeItem.create({
      data: { userId: user.id, sourcePurchaseId: purchase.id, itemName: "Test Item" },
    });
    // A manually-added wardrobe item, unrelated to this connection, must survive.
    const manualWardrobeItem = await prisma.wardrobeItem.create({
      data: { userId: user.id, itemName: "Manually Added Item" },
    });

    const purchaseCountBefore = await prisma.purchase.count({ where: { userId: user.id } });
    const wardrobeCountBefore = await prisma.wardrobeItem.count({ where: { userId: user.id } });
    expect(purchaseCountBefore).toBe(1);
    expect(wardrobeCountBefore).toBe(2);

    const response = await POST(buildRequest());

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(revokeGoogleToken).toHaveBeenCalledWith("fake-refresh");

    const connectionAfter = await prisma.emailConnection.findUnique({ where: { id: connection.id } });
    const purchaseAfter = await prisma.purchase.findUnique({ where: { id: purchase.id } });
    const wardrobeItemAfter = await prisma.wardrobeItem.findUnique({ where: { id: wardrobeItem.id } });
    const manualWardrobeItemAfter = await prisma.wardrobeItem.findUnique({
      where: { id: manualWardrobeItem.id },
    });

    expect(connectionAfter).toBeNull();
    expect(purchaseAfter).toBeNull();
    expect(wardrobeItemAfter).toBeNull();
    expect(manualWardrobeItemAfter).not.toBeNull();

    const purchaseCountAfter = await prisma.purchase.count({ where: { userId: user.id } });
    const wardrobeCountAfter = await prisma.wardrobeItem.count({ where: { userId: user.id } });
    expect(purchaseCountAfter).toBe(0);
    expect(wardrobeCountAfter).toBe(1);

    await prisma.wardrobeItem.deleteMany({ where: { id: manualWardrobeItem.id } });
  });
});
