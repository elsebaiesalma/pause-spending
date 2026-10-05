import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findFirstOrThrow: vi.fn().mockResolvedValue({ id: "u1" }) } },
}));

vi.mock("@/lib/recommendations/assembleRecommendations", () => ({
  assembleRecommendations: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { Prisma } from "@prisma/client";
import { assembleRecommendations } from "@/lib/recommendations/assembleRecommendations";
import { auth } from "@/lib/auth";
import RecommendationsPage from "./page";

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }), searchParams: Promise.resolve({}) };
}

describe("RecommendationsPage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("labels comparables/secondhand suggestions as not verified listings", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(assembleRecommendations).mockResolvedValueOnce({
      desiredItem: { id: "d1", itemName: "Wool Coat" } as never,
      comparables: [{ name: "Budget coat", estimatedPrice: 45, note: "Similar cut" }],
      secondhand: [{ name: "Pre-owned option", estimatedPrice: 30, note: "Often available" }],
      outfitIdeas: [],
    });

    const element = await RecommendationsPage(await ctxFor("d1"));
    const html = renderToStaticMarkup(element);

    expect(html).toContain("not verified");
    expect(html).toContain("Budget coat");
    expect(html).toContain("Pre-owned option");
  });

  it("renders outfit ideas referencing the real wardrobe item's name", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(assembleRecommendations).mockResolvedValueOnce({
      desiredItem: { id: "d1", itemName: "Wool Coat" } as never,
      comparables: [],
      secondhand: [],
      outfitIdeas: [
        {
          wardrobeItem: { id: "w1", itemName: "Black Boots", imageUrl: null } as never,
          suggestion: "Pair with your black boots.",
        },
      ],
    });

    const element = await RecommendationsPage(await ctxFor("d1"));
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Pair with your black boots.");
  });

  it("offers a save-for-later action posting to the resolve endpoint", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(assembleRecommendations).mockResolvedValueOnce({
      desiredItem: { id: "d1", itemName: "Wool Coat" } as never,
      comparables: [],
      secondhand: [],
      outfitIdeas: [],
    });

    const element = await RecommendationsPage(await ctxFor("d1"));
    const html = renderToStaticMarkup(element);

    expect(html).toContain('action="/api/desired-items/d1/resolve"');
    expect(html).toContain('value="saved_for_later"');
  });

  it("404s instead of rendering when the desired item belongs to another user", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(assembleRecommendations).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "test" })
    );

    await expect(RecommendationsPage(await ctxFor("belongs-to-u2"))).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });
});
