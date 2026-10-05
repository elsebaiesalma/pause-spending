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
  return new NextRequest("http://localhost:3000/api/wardrobe/x/return", { method: "POST" });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/wardrobe/[id]/return", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest(), await ctxFor("some-id"));

    expect(response.status).toBe(401);
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("returns 404 and never marks another user's wardrobe item returned", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const response = await POST(buildRequest(), await ctxFor(fixture.userB.wardrobeItem.id));

      expect(response.status).toBe(404);

      const unchanged = await prisma.wardrobeItem.findUniqueOrThrow({
        where: { id: fixture.userB.wardrobeItem.id },
      });
      expect(unchanged.status).toBe("active");
    });
  });
});
