import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ requireUserId: vi.fn() }));
vi.mock("@/lib/tagging/llmTagger", () => ({ extractWardrobeItemTags: vi.fn() }));

import { requireUserId } from "@/lib/session";
import { extractWardrobeItemTags } from "@/lib/tagging/llmTagger";
import { POST } from "./route";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/wardrobe/suggest-tags", { method: "POST", body: JSON.stringify(body) }) as never
  );
}

describe("POST /api/wardrobe/suggest-tags", () => {
  afterEach(() => vi.resetAllMocks());

  it("returns the session's refusal untouched when nobody is signed in", async () => {
    const refusal = new Response(null, { status: 401 });
    vi.mocked(requireUserId).mockResolvedValueOnce(refusal as never);
    expect(await post({ itemName: "Coat" })).toBe(refusal);
    expect(extractWardrobeItemTags).not.toHaveBeenCalled();
  });

  it("rejects a missing name without calling the model", async () => {
    vi.mocked(requireUserId).mockResolvedValueOnce("user-1");
    const response = await post({ itemName: "  " });
    expect(response.status).toBe(400);
    expect(extractWardrobeItemTags).not.toHaveBeenCalled();
  });

  it("returns a cleaned suggestion, asking by name and category only (no image)", async () => {
    vi.mocked(requireUserId).mockResolvedValueOnce("user-1");
    vi.mocked(extractWardrobeItemTags).mockResolvedValueOnce({
      category: "tops",
      colorName: "Ivory",
      colorFamily: "cream",
      styleTags: ["Minimal"],
      useCaseTags: ["Work"],
    });
    const response = await post({ itemName: "Linen shirt", category: "tops" });
    expect(await response.json()).toEqual({
      suggestion: { category: "tops", colorFamily: "cream", colorName: "Ivory", styleTags: ["minimal"], useCaseTags: ["work"] },
    });
    expect(extractWardrobeItemTags).toHaveBeenCalledWith({ itemName: "Linen shirt", category: "tops", imageUrl: null });
  });

  it("answers with no suggestion, not an error, when the model call fails", async () => {
    vi.mocked(requireUserId).mockResolvedValueOnce("user-1");
    vi.mocked(extractWardrobeItemTags).mockRejectedValueOnce(new Error("down"));
    const response = await post({ itemName: "Linen shirt" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestion: null });
  });
});
