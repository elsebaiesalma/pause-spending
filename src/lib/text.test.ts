import { describe, expect, it } from "vitest";
import { normalizeAiText } from "./text";

describe("normalizeAiText", () => {
  it("converts a literal backslash-u escape sequence into the real character", () => {
    expect(normalizeAiText("black dresses \\u2014 the navy one")).toBe(
      "black dresses — the navy one"
    );
  });

  it("converts multiple stray escapes in the same string", () => {
    expect(normalizeAiText("\\u201cHello\\u201d")).toBe('“Hello”');
  });

  it("leaves ordinary text untouched", () => {
    expect(normalizeAiText("a plain sentence with no escapes")).toBe(
      "a plain sentence with no escapes"
    );
  });

  it("leaves a real em dash character untouched", () => {
    expect(normalizeAiText("black dresses — done")).toBe("black dresses — done");
  });
});
