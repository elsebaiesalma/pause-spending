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
  return new NextRequest("http://localhost:3000/api/desired-items/x/restore", { method: "POST" });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/desired-items/[id]/restore", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest(), await ctxFor("some-id"));

    expect(response.status).toBe(401);
  });

  it("moves a let-go item back to saved_for_later and clears decisionOutcome", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: {
        userId: user.id,
        sourceType: "typed",
        itemName: "Let Go Sweater",
        userConfirmed: true,
        pauseStatus: "proceeded",
        decisionOutcome: "dropped",
      },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest(), await ctxFor(item.id));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toContain("/considering?tab=let-go");

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("saved_for_later");
    expect(updated.decisionOutcome).toBeNull();
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("returns 404 and never restores another user's item", async () => {
      fixture = await createTwoTenantFixture();
      await prisma.desiredItem.update({
        where: { id: fixture.userB.desiredItem.id },
        data: { pauseStatus: "proceeded", decisionOutcome: "dropped" },
      });
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const response = await POST(buildRequest(), await ctxFor(fixture.userB.desiredItem.id));

      expect(response.status).toBe(404);
      const unchanged = await prisma.desiredItem.findUniqueOrThrow({
        where: { id: fixture.userB.desiredItem.id },
      });
      expect(unchanged.pauseStatus).toBe("proceeded");
      expect(unchanged.decisionOutcome).toBe("dropped");
    });
  });
});
