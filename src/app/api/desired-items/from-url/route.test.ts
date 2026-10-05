import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/itemExtraction/urlExtractor", () => ({
  extractFromUrl: vi.fn(),
}));

vi.mock("@/lib/itemExtraction/searchProduct", () => ({
  deriveQueryFromUrlSlug: vi.fn(),
  searchForItem: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { extractFromUrl } from "@/lib/itemExtraction/urlExtractor";
import { deriveQueryFromUrlSlug, searchForItem } from "@/lib/itemExtraction/searchProduct";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

// searchForItem must never be called from this route - a pasted URL is
// never replaced by a search result, even when extraction fails. Asserted
// in afterEach so every test in this file covers it, not just the ones
// that mention it explicitly.
function expectSearchNeverCalled() {
  expect(searchForItem).not.toHaveBeenCalled();
}

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
    expectSearchNeverCalled();
    vi.mocked(extractFromUrl).mockReset();
    vi.mocked(deriveQueryFromUrlSlug).mockReset();
    vi.mocked(searchForItem).mockReset();
    vi.mocked(auth).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest("https://retailer.com/blazer"));

    expect(response.status).toBe(401);
    expect(extractFromUrl).not.toHaveBeenCalled();
  });

  it("creates an unconfirmed desired item with the extracted fields, including tags", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(extractFromUrl).mockResolvedValueOnce({
      itemName: "Navy Wool Blazer",
      price: 189.99,
      imageUrl: "https://cdn.retailer.com/blazer.jpg",
      category: "outerwear",
      colorName: "navy",
      colorFamily: "navy",
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
    expect(item.colorName).toBe("navy");
    expect(item.colorFamily).toBe("navy");
    expect(item.styleTags).toEqual(["business-casual"]);
    expect(item.userConfirmed).toBe(false);
    expect(item.pauseStatus).toBe("pending_confirmation");
    expect(item.itemNameConfidence).toBeNull();
  });

  it("still creates a row (fully blank) when extraction fails and the URL's slug yields nothing usable", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(extractFromUrl).mockResolvedValueOnce(null);
    vi.mocked(deriveQueryFromUrlSlug).mockReturnValueOnce(null);

    const response = await POST(buildRequest("https://retailer.com/unreachable"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({
      where: { rawInput: "https://retailer.com/unreachable" },
    });
    createdIds.push(item.id);

    expect(item.itemName).toBeNull();
    expect(item.itemNameConfidence).toBeNull();
    expect(item.price).toBeNull();
    expect(item.userConfirmed).toBe(false);
  });

  it("prefills itemName from the URL's own slug at low confidence when extraction fails - never a search result, the pasted URL always stays rawInput", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(extractFromUrl).mockResolvedValueOnce(null);
    vi.mocked(deriveQueryFromUrlSlug).mockReturnValueOnce("wool coat");

    const response = await POST(buildRequest("https://retailer.com/blocked-page"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({
      where: { rawInput: "https://retailer.com/blocked-page" },
    });
    createdIds.push(item.id);

    expect(item.itemName).toBe("Wool Coat");
    expect(item.itemNameConfidence).toBe("low");
    expect(item.price).toBeNull();
    expect(item.imageUrl).toBeNull();
    expect(item.sourceType).toBe("url");
    expect(item.rawInput).toBe("https://retailer.com/blocked-page");
  });
});
