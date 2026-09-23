import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("sets a wait_until roughly 24 hours out and pause_status=waiting", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Navy Blazer", userConfirmed: true },
    });
    createdIds.push(item.id);

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

    const before = Date.now();
    await POST(buildRequest({ duration: "7d" }), await ctxFor(item.id));

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    const deltaMs = updated.waitUntil!.getTime() - before;
    expect(deltaMs).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(deltaMs).toBeLessThan(7.1 * 24 * 60 * 60 * 1000);
  });

  it("rejects an invalid duration", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Navy Blazer", userConfirmed: true },
    });
    createdIds.push(item.id);

    const response = await POST(buildRequest({ duration: "1h" }), await ctxFor(item.id));
    expect(response.status).toBe(400);

    const unchanged = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.pauseStatus).toBe("pending_confirmation");
  });
});
