import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest("http://localhost:3000/api/desired-items/x/confirm", {
    method: "POST",
    body: form,
  });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/desired-items/[id]/confirm", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("stays unconfirmed until this endpoint is explicitly called", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", rawInput: "navy blazer", itemName: null },
    });
    createdIds.push(item.id);

    expect(item.userConfirmed).toBe(false);

    const before = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(before.userConfirmed).toBe(false);
  });

  it("sets userConfirmed=true and persists the (possibly corrected) fields", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", rawInput: "navy blazer", itemName: null },
    });
    createdIds.push(item.id);

    const response = await POST(
      buildRequest({ itemName: "Navy Wool Blazer", price: "189.99", imageUrl: "" }),
      await ctxFor(item.id)
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.userConfirmed).toBe(true);
    expect(updated.itemName).toBe("Navy Wool Blazer");
    expect(Number(updated.price)).toBeCloseTo(189.99);
  });

  it("persists corrected category, color, and style tags", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "url", rawInput: "https://retailer.com/blazer", itemName: null },
    });
    createdIds.push(item.id);

    await POST(
      buildRequest({
        itemName: "Navy Wool Blazer",
        price: "189.99",
        category: "outerwear",
        primaryColor: "navy",
        styleTags: "business-casual, tailored",
      }),
      await ctxFor(item.id)
    );

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.category).toBe("outerwear");
    expect(updated.primaryColor).toBe("navy");
    expect(updated.styleTags).toEqual(["business-casual", "tailored"]);
  });

  it("rejects confirmation with no item name", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", rawInput: "navy blazer", itemName: null },
    });
    createdIds.push(item.id);

    const response = await POST(buildRequest({ itemName: "" }), await ctxFor(item.id));

    expect(response.status).toBe(400);

    const stillUnconfirmed = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(stillUnconfirmed.userConfirmed).toBe(false);
  });
});
