import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/itemExtraction/urlExtractor", () => ({
  extractFromUrl: vi.fn(),
}));

import { extractFromUrl } from "@/lib/itemExtraction/urlExtractor";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest(url: string) {
  const form = new FormData();
  form.set("url", url);
  return new NextRequest("http://localhost:3000/api/desired-items/from-url", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/desired-items/from-url", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(extractFromUrl).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("creates an unconfirmed desired item with the extracted fields, including tags", async () => {
    vi.mocked(extractFromUrl).mockResolvedValueOnce({
      itemName: "Navy Wool Blazer",
      price: 189.99,
      imageUrl: "https://cdn.retailer.com/blazer.jpg",
      category: "outerwear",
      primaryColor: "navy",
      styleTags: ["business-casual"],
    });

    const response = await POST(buildRequest("https://retailer.com/blazer"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({
      where: { rawInput: "https://retailer.com/blazer" },
    });
    createdIds.push(item.id);

    expect(item.sourceType).toBe("url");
    expect(item.itemName).toBe("Navy Wool Blazer");
    expect(Number(item.price)).toBeCloseTo(189.99);
    expect(item.imageUrl).toBe("https://cdn.retailer.com/blazer.jpg");
    expect(item.category).toBe("outerwear");
    expect(item.primaryColor).toBe("navy");
    expect(item.styleTags).toEqual(["business-casual"]);
    expect(item.userConfirmed).toBe(false);
    expect(item.pauseStatus).toBe("pending_confirmation");
  });

  it("still creates a row (blank fields) when extraction fails, rather than blocking", async () => {
    vi.mocked(extractFromUrl).mockResolvedValueOnce(null);

    const response = await POST(buildRequest("https://retailer.com/unreachable"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({
      where: { rawInput: "https://retailer.com/unreachable" },
    });
    createdIds.push(item.id);

    expect(item.itemName).toBeNull();
    expect(item.price).toBeNull();
    expect(item.userConfirmed).toBe(false);
  });
});
