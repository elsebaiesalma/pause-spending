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
  return new NextRequest("http://localhost:3000/api/auth/gmail/disconnect", {
    method: "POST",
    body: form,
  });
}

function mockSession(userId: string) {
  vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId } } as never);
}

describe("POST /api/auth/gmail/disconnect", () => {
  afterEach(async () => {
    vi.mocked(revokeGoogleToken).mockReset();
    vi.mocked(auth).mockReset();
    const user = await prisma.user.findFirst();
    if (user) {
      // Cascades to any purchases/wardrobe items created against this connection.
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

  it("returns 404 when there is no connection to disconnect", async () => {
    const user = await prisma.user.findFirstOrThrow();
    mockSession(user.id);

    const response = await POST(buildRequest(csrfTokenForUser(user.id)));

    expect(response.status).toBe(404);
    expect(revokeGoogleToken).not.toHaveBeenCalled();
  });

  it("revokes the token, marks the connection disconnected, and keeps derived data", async () => {
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

    const response = await POST(buildRequest(csrfTokenForUser(user.id)));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(revokeGoogleToken).toHaveBeenCalledWith("fake-refresh");

    const updatedConnection = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });
    expect(updatedConnection.status).toBe("disconnected");

    const purchaseStillExists = await prisma.purchase.findUnique({ where: { id: purchase.id } });
    const wardrobeItemStillExists = await prisma.wardrobeItem.findUnique({
      where: { id: wardrobeItem.id },
    });
    expect(purchaseStillExists).not.toBeNull();
    expect(wardrobeItemStillExists).not.toBeNull();
  });
});
