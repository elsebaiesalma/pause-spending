import { describe, expect, it } from "vitest";
import { hasReflectionAnswer } from "./reflectionGate";

describe("hasReflectionAnswer", () => {
  it("is false with neither a saved reflection nor a saved look", () => {
    expect(hasReflectionAnswer(null, false)).toBe(false);
  });

  it("accepts a saved look on its own", () => {
    expect(hasReflectionAnswer(null, true)).toBe(true);
  });

  it("still accepts a saved reflection", () => {
    expect(hasReflectionAnswer({ needScore: 5 }, false)).toBe(true);
    expect(hasReflectionAnswer({ needScore: 5 }, true)).toBe(true);
  });
});
