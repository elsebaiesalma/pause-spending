import { describe, expect, it } from "vitest";
import { matchBrand } from "./matchBrand";

describe("matchBrand", () => {
  it("matches a known brand name in a query", () => {
    const result = matchBrand("navy wool coat from Aritzia");
    expect(result?.name).toBe("Aritzia");
    expect(result?.domain).toBe("aritzia.com");
  });

  it("matches case-insensitively", () => {
    expect(matchBrand("ZARA leather jacket")?.name).toBe("Zara");
  });

  it("matches via an alias, not just the canonical name", () => {
    expect(matchBrand("lulu align leggings")?.name).toBe("Lululemon");
  });

  it("matches a possessive/apostrophe variant against a plain-name entry", () => {
    expect(matchBrand("levis 501 jeans")?.name).toBe("Levi's");
  });

  it("matches an '&' brand name typed as 'and'", () => {
    expect(matchBrand("h and m striped dress")?.name).toBe("H&M");
  });

  it("returns null for an unlisted/unknown brand rather than a wrong guess", () => {
    expect(matchBrand("navy coat from some tiny boutique nobody has heard of")).toBeNull();
  });

  it("returns null for an empty query", () => {
    expect(matchBrand("")).toBeNull();
    expect(matchBrand("   ")).toBeNull();
  });

  it("never matches a brand name as a bare substring inside an unrelated word", () => {
    // "gap" must not match inside "gaps"
    expect(matchBrand("there are gaps in my wardrobe")).toBeNull();
  });

  it("matches a listed no-space alias variant of a punctuated brand name", () => {
    expect(matchBrand("jcrew cashmere sweater")?.name).toBe("J.Crew");
    expect(matchBrand("j.crew cashmere sweater")?.name).toBe("J.Crew");
  });
});
