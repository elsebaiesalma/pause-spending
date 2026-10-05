import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/itemExtraction/screenshotExtractor", () => ({
  extractFromScreenshot: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { extractFromScreenshot } from "@/lib/itemExtraction/screenshotExtractor";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest() {
  const form = new FormData();
  const file = new File([new Uint8Array([1, 2, 3])], "screenshot.png", { type: "image/png" });
  form.set("screenshot", file);
  return new NextRequest("http://localhost:3000/api/desired-items/from-screenshot", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/desired-items/from-screenshot", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(extractFromScreenshot).mockReset();
    vi.mocked(auth).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest());

    expect(response.status).toBe(401);
    expect(extractFromScreenshot).not.toHaveBeenCalled();
  });

  it("creates an unconfirmed desired item with the identified fields", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(extractFromScreenshot).mockResolvedValueOnce({
      itemName: "Navy Wool Blazer",
      price: 189.99,
      currency: "USD",
      imageDescription: "A navy blazer",
    });

    const response = await POST(buildRequest());
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({ where: { sourceType: "screenshot" } });
    createdIds.push(item.id);

    expect(item.itemName).toBe("Navy Wool Blazer");
    expect(Number(item.price)).toBeCloseTo(189.99);
    expect(item.userConfirmed).toBe(false);
  });

  it("still creates a row (blank fields) when the screenshot can't be identified, rather than blocking", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(extractFromScreenshot).mockResolvedValueOnce(null);

    const response = await POST(buildRequest());
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({
      where: { sourceType: "screenshot", itemName: null },
    });
    createdIds.push(item.id);

    expect(item.itemName).toBeNull();
    expect(item.userConfirmed).toBe(false);
  });

  it("rejects a request with no file", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    const request = new NextRequest("http://localhost:3000/api/desired-items/from-screenshot", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
