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
  return new NextRequest("http://localhost:3000/api/desired-items/x/wait", {
    method: "POST",
    body: form,
  });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/desired-items/[id]/wait", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest({ duration: "24h" }), await ctxFor("some-id"));

    expect(response.status).toBe(401);
  });

  it("sets a wait_until roughly 24 hours out and pause_status=waiting", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Navy Blazer", userConfirmed: true },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const before = Date.now();
    const response = await POST(buildRequest({ duration: "24h" }), await ctxFor(item.id));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("waiting");
    expect(updated.waitUntil).not.toBeNull();
    const deltaMs = updated.waitUntil!.getTime() - before;
    expect(deltaMs).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(deltaMs).toBeLessThan(24.1 * 60 * 60 * 1000);
  });

  it("sets a wait_until roughly 7 days out for the 7d option", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Navy Blazer", userConfirmed: true },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const before = Date.now();
    await POST(buildRequest({ duration: "7d" }), await ctxFor(item.id));

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    const deltaMs = updated.waitUntil!.getTime() - before;
    expect(deltaMs).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(deltaMs).toBeLessThan(7.1 * 24 * 60 * 60 * 1000);
  });

  it("still sets the wait timer when a reflection answer is included, even though its migration isn't applied yet", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Navy Blazer", userConfirmed: true },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({ duration: "24h", reflectionNeedScore: "6", reflectionReasonFor: "It's for a trip" }),
      await ctxFor(item.id)
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("waiting");
  });

  it("rejects an invalid duration", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Navy Blazer", userConfirmed: true },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest({ duration: "1h" }), await ctxFor(item.id));
    expect(response.status).toBe(400);

    const unchanged = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.pauseStatus).toBe("pending_confirmation");
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("returns 404 and never sets a wait timer on another user's item", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const response = await POST(
        buildRequest({ duration: "24h" }),
        await ctxFor(fixture.userB.desiredItem.id)
      );

      expect(response.status).toBe(404);

      const unchanged = await prisma.desiredItem.findUniqueOrThrow({
        where: { id: fixture.userB.desiredItem.id },
      });
      expect(unchanged.pauseStatus).toBe(fixture.userB.desiredItem.pauseStatus);
      expect(unchanged.waitUntil).toBeNull();
    });
  });
});
