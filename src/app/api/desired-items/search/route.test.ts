import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/itemExtraction/searchProduct", () => ({
  searchForItem: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { searchForItem } from "@/lib/itemExtraction/searchProduct";
import { GET } from "./route";

function buildRequest(query: string) {
  return new NextRequest(`http://localhost:3000/api/desired-items/search?q=${encodeURIComponent(query)}`);
}

describe("GET /api/desired-items/search", () => {
  const originalKey = process.env.BRAVE_SEARCH_API_KEY;

  afterEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(searchForItem).mockReset();
    process.env.BRAVE_SEARCH_API_KEY = originalKey;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await GET(buildRequest("navy blazer"));

    expect(response.status).toBe(401);
    expect(searchForItem).not.toHaveBeenCalled();
  });

  it("returns 400 when the query is shorter than 3 characters", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);

    const response = await GET(buildRequest("na"));

    expect(response.status).toBe(400);
    expect(searchForItem).not.toHaveBeenCalled();
  });

  it("returns 503 when BRAVE_SEARCH_API_KEY is unset, rather than attempting the search", async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);

    const response = await GET(buildRequest("navy blazer"));

    expect(response.status).toBe(503);
    expect(searchForItem).not.toHaveBeenCalled();
  });

  it("returns the search results on success", async () => {
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(searchForItem).mockResolvedValueOnce({
      candidates: [
        {
          itemName: "Navy Blazer",
          price: 189.99,
          imageUrl: null,
          category: "outerwear",
          colorName: "navy",
          colorFamily: "navy",
          styleTags: [],
          url: "https://zara.com/x",
          merchant: "zara.com",
        },
      ],
      scopedToBrand: "Zara",
    });

    const response = await GET(buildRequest("zara navy blazer"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candidates).toHaveLength(1);
    expect(body.scopedToBrand).toBe("Zara");
  });

  it("returns 502 without leaking the raw error when the search pipeline throws", async () => {
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(searchForItem).mockRejectedValueOnce(new Error("Brave Search API request failed (500)"));

    const response = await GET(buildRequest("zara navy blazer"));

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("search_failed");
  });
});
