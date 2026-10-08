import { describe, expect, it } from "vitest";
import { classifySmartAddInput } from "./smartAdd";

describe("classifySmartAddInput", () => {
  it("treats a blank box as empty", () => {
    expect(classifySmartAddInput("   ")).toEqual({ kind: "empty" });
  });

  it("recognises full URLs and trims them", () => {
    expect(classifySmartAddInput("  https://www.zara.com/us/en/coat-p123.html ")).toEqual({
      kind: "url",
      url: "https://www.zara.com/us/en/coat-p123.html",
    });
  });

  it("adds https to www. and host/path pastes", () => {
    expect(classifySmartAddInput("www.zara.com/coat")).toEqual({ kind: "url", url: "https://www.zara.com/coat" });
    expect(classifySmartAddInput("everlane.com/products/coat")).toEqual({
      kind: "url",
      url: "https://everlane.com/products/coat",
    });
  });

  it("treats descriptions as text, even with a dot or a link-like word", () => {
    expect(classifySmartAddInput("navy wool blazer")).toEqual({ kind: "text", text: "navy wool blazer" });
    expect(classifySmartAddInput("see https://a.com/x please")).toEqual({
      kind: "text",
      text: "see https://a.com/x please",
    });
    expect(classifySmartAddInput("blazer")).toEqual({ kind: "text", text: "blazer" });
    expect(classifySmartAddInput("v1.5")).toEqual({ kind: "text", text: "v1.5" });
  });
});
