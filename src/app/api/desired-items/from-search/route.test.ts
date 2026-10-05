import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest("http://localhost:3000/api/desired-items/from-search", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/desired-items/from-search", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest({ url: "https://zara.com/x", itemName: "Navy Blazer" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 when itemName is missing", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest({ url: "https://zara.com/x" }));

    expect(response.status).toBe(400);
  });

  it("creates an unconfirmed desired item from the candidate's already-extracted fields, without re-fetching", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({
        url: "https://zara.com/x",
        itemName: "Navy Wool Blazer",
        brand: "Zara",
        price: "189.99",
        imageUrl: "https://cdn.zara.com/blazer.jpg",
        category: "outerwear",
        colorName: "navy",
        colorFamily: "navy",
      })
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({ where: { rawInput: "https://zara.com/x" } });
    createdIds.push(item.id);

    expect(item.sourceType).toBe("search");
    expect(item.itemName).toBe("Navy Wool Blazer");
    expect(item.brand).toBe("Zara");
    expect(Number(item.price)).toBeCloseTo(189.99);
    expect(item.colorFamily).toBe("navy");
    expect(item.userConfirmed).toBe(false);
    expect(item.pauseStatus).toBe("pending_confirmation");
  });

  it("discards an invalid colorFamily rather than persisting a bad value", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({ url: "https://zara.com/y", itemName: "Item", colorFamily: "not-a-real-family" })
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({ where: { rawInput: "https://zara.com/y" } });
    createdIds.push(item.id);
    expect(item.colorFamily).toBeNull();
  });

  it("persists the candidate's itemNameConfidence, so a low-confidence search match is flagged on the confirm step", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({ url: "https://zara.com/z", itemName: "Wool Coat", itemNameConfidence: "low" })
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({ where: { rawInput: "https://zara.com/z" } });
    createdIds.push(item.id);
    expect(item.itemNameConfidence).toBe("low");
  });

  it("leaves itemNameConfidence null for a high-confidence match (structured Product data, no confidence sent)", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest({ url: "https://zara.com/w", itemName: "Wool Coat" }));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({ where: { rawInput: "https://zara.com/w" } });
    createdIds.push(item.id);
    expect(item.itemNameConfidence).toBeNull();
  });
});
