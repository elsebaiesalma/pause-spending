import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { POST } from "./route";

function buildRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest("http://localhost:3000/api/wardrobe/x/update", { method: "POST", body: form });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/wardrobe/[id]/update", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest({ itemName: "Navy Boots" }), await ctxFor("some-id"));

    expect(response.status).toBe(401);
  });

  it("rejects (400) an out-of-list colorFamily rather than silently nulling it, and never mutates the item", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.wardrobeItem.create({
      data: { userId: user.id, itemName: "Navy Boots", colorFamily: "navy", status: "active" },
    });
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({ itemName: "Stolen Name", colorFamily: "not-a-real-family" }),
      await ctxFor(item.id)
    );

    expect(response.status).toBe(400);

    const unchanged = await prisma.wardrobeItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.itemName).toBe("Navy Boots");
    expect(unchanged.colorFamily).toBe("navy");

    await prisma.wardrobeItem.delete({ where: { id: item.id } });
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("returns 404 and never edits another user's wardrobe item", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const response = await POST(
        buildRequest({ itemName: "Stolen Boots", category: "shoes" }),
        await ctxFor(fixture.userB.wardrobeItem.id)
      );

      expect(response.status).toBe(404);

      const unchanged = await prisma.wardrobeItem.findUniqueOrThrow({
        where: { id: fixture.userB.wardrobeItem.id },
      });
      expect(unchanged.itemName).toBe(fixture.userB.wardrobeItem.itemName);
    });
  });
});
