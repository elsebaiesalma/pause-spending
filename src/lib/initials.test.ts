import { describe, expect, it } from "vitest";
import { initialsFor } from "./initials";

describe("initialsFor", () => {
  it("uses the first letters of the first two words of the name", () => {
    expect(initialsFor("Salma Elsebaie", "x@y.com")).toBe("SE");
    expect(initialsFor("ada king lovelace", null)).toBe("AK");
  });

  it("uses the first two letters of a single-word name", () => {
    expect(initialsFor("Salma", null)).toBe("SA");
  });

  it("falls back to the email's local part, then to a question mark", () => {
    expect(initialsFor(null, "jane.doe@example.com")).toBe("JA");
    expect(initialsFor("  ", "")).toBe("?");
    expect(initialsFor(undefined, undefined)).toBe("?");
  });
});
