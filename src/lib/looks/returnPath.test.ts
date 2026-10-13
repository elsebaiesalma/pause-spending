import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./returnPath";

describe("safeReturnPath", () => {
  it("keeps same-site paths", () => {
    expect(safeReturnPath("/lookbook")).toBe("/lookbook");
    expect(safeReturnPath("/desired-items/abc/pause")).toBe("/desired-items/abc/pause");
    expect(safeReturnPath("/desired-items/abc/pause?x=1#reflection")).toBe("/desired-items/abc/pause?x=1#reflection");
  });

  it("falls back to the Lookbook for anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\evil.example", "javascript:alert(1)", "evil", "", undefined, null]) {
      expect(safeReturnPath(bad as string | undefined)).toBe("/lookbook");
    }
  });
});
