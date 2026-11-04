import { describe, expect, it } from "vitest";
import { RECEIPT_LINES, WINDOW_LINES, feedLine, lineAt, money, receiptTotals, runningTotals, tabTotals } from "./receipt";

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

  it("keeps printing the same tab: the feed is a fixed cycle", () => {
    expect(feedLine(0).name).toBe("Ribbed tank");
    expect(feedLine(10)).toEqual(feedLine(0));
    expect(feedLine(-1)).toEqual(feedLine(9));
  });

  it("running totals start at the example's and add each printed line", () => {
    expect(runningTotals(0)).toEqual({ all: 292, kept: 69, afterPause: 223 });
    const one = runningTotals(1);
    expect(one.all).toBe(292 + feedLine(0).price);
    expect(one.kept).toBe(69);
    const two = runningTotals(2);
    expect(two.kept).toBe(69 + feedLine(1).price);
    expect(two.all - two.kept).toBe(two.afterPause);
  });

  it("the visible window is the four starting lines then the feed, and its totals match", () => {
    const first = Array.from({ length: WINDOW_LINES }, (_, i) => lineAt(i));
    expect(first.slice(0, 4)).toEqual([...RECEIPT_LINES]);
    expect(first[4]).toEqual(feedLine(0));
    const sum = (lines: typeof first) => lines.reduce((t, l) => t + l.price, 0);
    const totals = tabTotals(0);
    expect(totals.all).toBe(sum(first));
    expect(totals.kept).toBe(sum(first.filter((l) => l.repeat)));
    expect(tabTotals(3).all).toBe(sum(Array.from({ length: WINDOW_LINES + 3 }, (_, i) => lineAt(i))));
  });
});
