import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest("http://localhost:3000/api/desired-items/x/resolve", {
    method: "POST",
    body: form,
  });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/desired-items/[id]/resolve", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  async function makeWaitingItem() {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: {
        userId: user.id,
        sourceType: "typed",
        itemName: "Navy Blazer",
        userConfirmed: true,
        pauseStatus: "waiting",
        waitUntil: new Date("2020-01-01"),
      },
    });
    createdIds.push(item.id);
    return item;
  }

  it("records 'proceeded' and resolves pause_status", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "proceeded" }), await ctxFor(item.id));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("proceeded");
    expect(updated.decisionOutcome).toBe("proceeded");
  });

  it("records 'dropped' and resolves pause_status", async () => {
    const item = await makeWaitingItem();

    await POST(buildRequest({ outcome: "dropped" }), await ctxFor(item.id));

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("proceeded");
    expect(updated.decisionOutcome).toBe("dropped");
  });

  it("records 'saved_for_later' as its own pause_status, distinct from 'proceeded'", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "saved_for_later" }), await ctxFor(item.id));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toContain("/wishlist");

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("saved_for_later");
    expect(updated.decisionOutcome).toBe("saved_for_later");
  });

  it("redirects to the recommendations page on 'proceeded'", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "proceeded" }), await ctxFor(item.id));

    expect(response.headers.get("location")).toContain(`/desired-items/${item.id}/recommendations`);
  });

  it("rejects an unrecognized outcome", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "maybe" }), await ctxFor(item.id));
    expect(response.status).toBe(400);

    const unchanged = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.pauseStatus).toBe("waiting");
    expect(unchanged.decisionOutcome).toBeNull();
  });
});
