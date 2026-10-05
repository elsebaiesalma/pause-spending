import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/oauth/google", async () => {
  const actual = await vi.importActual<typeof import("@/lib/oauth/google")>(
    "@/lib/oauth/google"
  );
  return { ...actual, revokeGoogleToken: vi.fn() };
});

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { revokeGoogleToken } from "@/lib/oauth/google";
import { auth } from "@/lib/auth";
import { csrfTokenForUser } from "@/lib/csrf";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const FAKE_STORED_TOKEN = JSON.stringify({
  accessToken: "fake-access",
  refreshToken: "fake-refresh",
  expiresAt: Date.now() + 3_600_000,
});

function buildRequest(csrfToken?: string) {
  const form = new FormData();
  if (csrfToken !== undefined) form.set("csrfToken", csrfToken);
  return new NextRequest("http://localhost:3000/api/auth/gmail/delete", {
    method: "POST",
    body: form,
  });
}

function mockSession(userId: string) {
  vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId } } as never);
}

describe("POST /api/auth/gmail/delete", () => {
  afterEach(async () => {
    vi.mocked(revokeGoogleToken).mockReset();
    vi.mocked(auth).mockReset();
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.emailConnection.deleteMany({ where: { userId: user.id, provider: "gmail" } });
    }
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest("anything"));

    expect(response.status).toBe(401);
    expect(revokeGoogleToken).not.toHaveBeenCalled();
  });

  it("returns 403 when the csrf token is missing or wrong", async () => {
    const user = await prisma.user.findFirstOrThrow();
    mockSession(user.id);

    const response = await POST(buildRequest("wrong-token"));

    expect(response.status).toBe(403);
    expect(revokeGoogleToken).not.toHaveBeenCalled();
  });

  it("returns 404 when there is no connection to delete", async () => {
    const user = await prisma.user.findFirstOrThrow();
    mockSession(user.id);

    const response = await POST(buildRequest(csrfTokenForUser(user.id)));

    expect(response.status).toBe(404);
    expect(revokeGoogleToken).not.toHaveBeenCalled();
  });

  it("revokes the token and purges the connection, its purchases, and their wardrobe items", async () => {
    vi.mocked(revokeGoogleToken).mockResolvedValueOnce(undefined);

    const user = await prisma.user.findFirstOrThrow();
    mockSession(user.id);
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
    // Cleaned up in `finally` (not just at the end of the try) - the cascade
    // delete from the emailConnection above only covers `wardrobeItem`, not
    // this unrelated one, so if any assertion below throws, this must not be
    // left behind for the next test run to trip over.
    const manualWardrobeItem = await prisma.wardrobeItem.create({
      data: { userId: user.id, itemName: "Manually Added Item" },
    });

    try {
      const purchaseCountBefore = await prisma.purchase.count({ where: { userId: user.id } });
      const wardrobeCountBefore = await prisma.wardrobeItem.count({ where: { userId: user.id } });
      expect(purchaseCountBefore).toBe(1);
      expect(wardrobeCountBefore).toBe(2);

      const response = await POST(buildRequest(csrfTokenForUser(user.id)));

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
    } finally {
      await prisma.wardrobeItem.deleteMany({ where: { id: manualWardrobeItem.id } });
    }
  });
});
