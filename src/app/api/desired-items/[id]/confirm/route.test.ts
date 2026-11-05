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
    vi.mocked(auth).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest({ itemName: "Navy Wool Blazer" }), await ctxFor("some-id"));

    expect(response.status).toBe(401);
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
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({ itemName: "Navy Wool Blazer", price: "189.99", imageUrl: "" }),
      await ctxFor(item.id)
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.userConfirmed).toBe(true);
    expect(updated.userEdited).toBe(true);
    expect(updated.itemName).toBe("Navy Wool Blazer");
    expect(Number(updated.price)).toBeCloseTo(189.99);
  });

  it("clears itemNameConfidence on confirm - the user has now reviewed the name, it's no longer just a guess", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: {
        userId: user.id,
        sourceType: "url",
        rawInput: "https://retailer.com/blocked",
        itemName: "Wool Coat",
        itemNameConfidence: "low",
      },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    await POST(buildRequest({ itemName: "Wool Coat" }), await ctxFor(item.id));

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.itemNameConfidence).toBeNull();
  });

  it("persists corrected category, color, and style tags", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "url", rawInput: "https://retailer.com/blazer", itemName: null },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    await POST(
      buildRequest({
        itemName: "Navy Wool Blazer",
        price: "189.99",
        category: "outerwear",
        colorName: "navy",
        colorFamily: "navy",
        styleTags: "business-casual, tailored",
      }),
      await ctxFor(item.id)
    );

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.category).toBe("outerwear");
    expect(updated.colorName).toBe("navy");
    expect(updated.colorFamily).toBe("navy");
    expect(updated.styleTags).toEqual(["business-casual", "tailored"]);
  });

  it("accepts a colorName not in the fixed list, since it's display text, not matched against anything", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", rawInput: "espresso blazer", itemName: null },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    await POST(
      buildRequest({
        itemName: "Espresso Blazer",
        colorName: "Espresso",
        colorFamily: "brown",
      }),
      await ctxFor(item.id)
    );

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.colorName).toBe("Espresso");
    expect(updated.colorFamily).toBe("brown");
  });

  it("rejects (400) an out-of-list colorFamily rather than silently nulling it, and never mutates the item", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", rawInput: "espresso blazer", itemName: null },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({
        itemName: "Espresso Blazer",
        colorName: "Espresso",
        colorFamily: "not-a-real-family",
      }),
      await ctxFor(item.id)
    );

    expect(response.status).toBe(400);

    const unchanged = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.colorName).toBeNull();
    expect(unchanged.colorFamily).toBeNull();
    expect(unchanged.userConfirmed).toBe(false);
  });

  it("leaves colorFamily null when omitted entirely - that's legitimately unknown, not an error", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", rawInput: "navy blazer", itemName: null },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest({ itemName: "Navy Blazer" }), await ctxFor(item.id));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.colorFamily).toBeNull();
    expect(updated.userConfirmed).toBe(true);
  });

  it("rejects confirmation with no item name", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", rawInput: "navy blazer", itemName: null },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest({ itemName: "" }), await ctxFor(item.id));

    expect(response.status).toBe(400);

    const stillUnconfirmed = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(stillUnconfirmed.userConfirmed).toBe(false);
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("returns 404 and never mutates the item when it belongs to another user", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const response = await POST(
        buildRequest({ itemName: "Stolen Blazer", price: "1.00" }),
        await ctxFor(fixture.userB.desiredItem.id)
      );

      expect(response.status).toBe(404);

      const unchanged = await prisma.desiredItem.findUniqueOrThrow({
        where: { id: fixture.userB.desiredItem.id },
      });
      expect(unchanged.itemName).toBe(fixture.userB.desiredItem.itemName);
      expect(unchanged.userConfirmed).toBe(fixture.userB.desiredItem.userConfirmed);
    });
  });

  it("leaves the stored photo alone when the form has none, and clears it only when asked", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "url", itemName: "Tee", imageUrl: "https://example.com/tee.jpg" },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValue({ user: { id: user.id } } as never);

    const kept = await POST(buildRequest({ itemName: "Tee" }), await ctxFor(item.id));
    expect(kept.status).toBe(303);
    expect((await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } })).imageUrl).toBe(
      "https://example.com/tee.jpg"
    );

    await POST(buildRequest({ itemName: "Tee", removePhoto: "1" }), await ctxFor(item.id));
    expect((await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } })).imageUrl).toBeNull();
  });
});
