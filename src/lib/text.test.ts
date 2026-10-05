import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, normalizeAiText } from "./text";

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

describe("decodeHtmlEntities", () => {
  it("decodes common named entities", () => {
    expect(decodeHtmlEntities("Women&#39;s &amp; Men&#39;s Clothing")).toBe("Women's & Men's Clothing");
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeHtmlEntities("&quot;Quoted&quot;")).toBe('"Quoted"');
  });

  it("decodes numeric and hex entities", () => {
    expect(decodeHtmlEntities("caf&#233;")).toBe("café");
    expect(decodeHtmlEntities("caf&#xe9;")).toBe("café");
  });

  it("leaves plain text with no entities untouched", () => {
    expect(decodeHtmlEntities("Navy Wool Blazer")).toBe("Navy Wool Blazer");
  });

  it("leaves an unrecognized entity name untouched rather than guessing", () => {
    expect(decodeHtmlEntities("A &foobar; B")).toBe("A &foobar; B");
  });
});
