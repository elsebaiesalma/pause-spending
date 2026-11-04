import { describe, expect, it } from "vitest";
import { RECEIPT_LINES, money, receiptPhase, receiptTotals } from "./receipt";

describe("example receipt", () => {
  it("adds up: the repeats come off and the rest stays in the plan", () => {
    const totals = receiptTotals();
    expect(totals.firstThree).toBe(103);
    expect(totals.all).toBe(292);
    expect(totals.kept).toBe(69);
    expect(totals.afterPause).toBe(223);
    expect(totals.all - totals.kept).toBe(totals.afterPause);
  });

  it("marks exactly the two repeat tees", () => {
    expect(RECEIPT_LINES.filter((line) => line.repeat).map((line) => line.name)).toEqual([
      "White linen tee",
      "Oversized white tee",
    ]);
  });

  it("formats money with cents", () => {
    expect(money(69)).toBe("$69.00");
  });

  it("moves through the four phases as the page scrolls", () => {
    expect(receiptPhase(0)).toBe(0);
    expect(receiptPhase(0.4)).toBe(1);
    expect(receiptPhase(0.65)).toBe(2);
    expect(receiptPhase(0.9)).toBe(3);
  });
});
