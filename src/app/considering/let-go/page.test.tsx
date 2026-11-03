import { describe, expect, it } from "vitest";
import LetGoListPage from "./page";

describe("LetGoListPage", () => {
  it("sends old links to the Let go tab on Decisions", () => {
    expect(() => LetGoListPage()).toThrow();
    try {
      LetGoListPage();
    } catch (error) {
      expect(String((error as { digest?: string }).digest)).toContain("/considering?tab=let-go");
    }
  });
});
