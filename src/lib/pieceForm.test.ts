import { describe, expect, it } from "vitest";
import { addTag, normalizeTag, removeTag, todayISO, toSuggestion, validateName, validateOwnedSince, MAX_TAGS } from "./pieceForm";

describe("tags", () => {
  it("lower-cases, trims and drops commas, which the API splits on", () => {
    expect(normalizeTag("  Business, Casual ")).toBe("business casual");
  });

  it("ignores blanks and duplicates, and stops at the cap", () => {
    expect(addTag(["work"], "  ")).toEqual(["work"]);
    expect(addTag(["work"], "WORK")).toEqual(["work"]);
    const full = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`);
    expect(addTag(full, "one more")).toEqual(full);
    expect(addTag(["work"], "weekend")).toEqual(["work", "weekend"]);
  });

  it("removes one tag", () => {
    expect(removeTag(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("validation", () => {
  it("needs a name", () => {
    expect(validateName("  ")).toMatch(/name/i);
    expect(validateName("Coat")).toBeNull();
  });

  it("allows no date, today and the past, but not a future date or a bad format", () => {
    expect(validateOwnedSince("", "2026-11-04")).toBeNull();
    expect(validateOwnedSince("2026-11-04", "2026-11-04")).toBeNull();
    expect(validateOwnedSince("2025-01-02", "2026-11-04")).toBeNull();
    expect(validateOwnedSince("2026-11-05", "2026-11-04")).toMatch(/earlier/);
    expect(validateOwnedSince("11/04/2026", "2026-11-04")).toMatch(/date/i);
  });

  it("writes today as yyyy-mm-dd from local time", () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("toSuggestion", () => {
  it("keeps only the closet's own categories and colour families, and caps and cleans tags", () => {
    const result = toSuggestion({
      category: "Outerwear",
      colorName: " Charcoal ",
      colorFamily: "grey",
      styleTags: ["Classic", "classic", "Minimal", "Tailored", "Smart", "Extra"],
      useCaseTags: ["Work", "Winter", "Travel", "Dinner"],
    });
    expect(result).toEqual({
      category: "outerwear",
      colorFamily: "grey",
      colorName: "Charcoal",
      styleTags: ["classic", "minimal", "tailored", "smart"],
      useCaseTags: ["work", "winter", "travel"],
    });
    expect(
      toSuggestion({ category: "capes", colorName: null, colorFamily: "teal", styleTags: [], useCaseTags: [] })
    ).toMatchObject({ category: null, colorFamily: null, colorName: null });
  });
});

describe("price", () => {
  it("accepts blank, whole, decimal and $-prefixed amounts", async () => {
    const { parsePrice } = await import("./pieceForm");
    expect(parsePrice("")).toEqual({ ok: true, value: null });
    expect(parsePrice(" $49.9 ")).toEqual({ ok: true, value: 49.9 });
    expect(parsePrice("1,250")).toEqual({ ok: true, value: 1250 });
    expect(parsePrice("0")).toEqual({ ok: true, value: 0 });
  });

  it("rejects text, negatives, extra decimals and absurd values", async () => {
    const { parsePrice, validatePrice } = await import("./pieceForm");
    for (const bad of ["abc", "-5", "4.999", "1e3", "999999"]) expect(parsePrice(bad)).toEqual({ ok: false });
    expect(validatePrice("abc")).toMatch(/price/i);
    expect(validatePrice("12.50")).toBeNull();
  });
});
