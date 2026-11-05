import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/colorFamily", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/colorFamily")>()),
  classifyColorFamilyByLLM: vi.fn(),
}));

import { classifyColorFamilyByLLM } from "@/lib/colorFamily";
import { resolveColor } from "./colorResolve";

describe("resolveColor", () => {
  afterEach(() => vi.resetAllMocks());

  it("keeps a chosen family and needs no model", async () => {
    expect(await resolveColor({ colorFamily: "navy" })).toEqual({ colorFamily: "navy", colorName: null });
    expect(classifyColorFamilyByLLM).not.toHaveBeenCalled();
  });

  it("files a typed word under its family from the word list, keeping the word for display", async () => {
    expect(await resolveColor({ colorName: "Burgundy" })).toEqual({ colorFamily: "red", colorName: "Burgundy" });
    expect(await resolveColor({ colorName: "Dark olive green" })).toEqual({ colorFamily: "green", colorName: "Dark olive green" });
    expect(classifyColorFamilyByLLM).not.toHaveBeenCalled();
  });

  it("asks the model only for a word the list doesn't know, and survives it failing", async () => {
    vi.mocked(classifyColorFamilyByLLM).mockResolvedValueOnce("pink");
    expect(await resolveColor({ colorName: "Dusty zinnia" })).toEqual({ colorFamily: "pink", colorName: "Dusty zinnia" });
    vi.mocked(classifyColorFamilyByLLM).mockRejectedValueOnce(new Error("down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await resolveColor({ colorName: "Zorp" })).toEqual({ colorFamily: null, colorName: "Zorp" });
    warn.mockRestore();
  });

  it("returns nothing when nothing was given, and ignores a family outside the list", async () => {
    expect(await resolveColor({})).toEqual({ colorFamily: null, colorName: null });
    expect(await resolveColor({ colorFamily: "teal", colorName: "Burgundy" })).toEqual({ colorFamily: "red", colorName: "Burgundy" });
  });
});
