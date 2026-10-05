import { describe, expect, it } from "vitest";
import { isStoreVisitAnswer, parseBoughtPrice, shouldAskDidYouBuy } from "./storeVisit";

describe("parseBoughtPrice", () => {
  it("accepts a positive price, including cents", () => {
    expect(parseBoughtPrice("129.5")).toBe(129.5);
    expect(parseBoughtPrice("0.01")).toBe(0.01);
  });

  it("refuses a missing, zero, negative, or non-numeric price rather than storing a guess", () => {
    expect(parseBoughtPrice(null)).toBeNull();
    expect(parseBoughtPrice("")).toBeNull();
    expect(parseBoughtPrice("   ")).toBeNull();
    expect(parseBoughtPrice("0")).toBeNull();
    expect(parseBoughtPrice("-5")).toBeNull();
    expect(parseBoughtPrice("abc")).toBeNull();
    expect(parseBoughtPrice("Infinity")).toBeNull();
  });
});

describe("isStoreVisitAnswer", () => {
  it("accepts only the three answers", () => {
    expect(isStoreVisitAnswer("bought")).toBe(true);
    expect(isStoreVisitAnswer("not_bought")).toBe(true);
    expect(isStoreVisitAnswer("not_sure")).toBe(true);
    expect(isStoreVisitAnswer("proceeded")).toBe(false);
    expect(isStoreVisitAnswer(undefined)).toBe(false);
  });
});

describe("shouldAskDidYouBuy", () => {
  it("asks only after a store visit that has not yet been answered", () => {
    const visited = new Date("2026-10-05T10:00:00Z");
    expect(shouldAskDidYouBuy({ wentToStoreAt: visited, answer: null })).toBe(true);
  });

  it("does not ask again once answered, including 'Not sure yet'", () => {
    const visited = new Date("2026-10-05T10:00:00Z");
    expect(shouldAskDidYouBuy({ wentToStoreAt: visited, answer: "not_sure" })).toBe(false);
    expect(shouldAskDidYouBuy({ wentToStoreAt: visited, answer: "bought" })).toBe(false);
  });

  it("does not ask when there has been no store visit, or no state could be read", () => {
    expect(shouldAskDidYouBuy({ wentToStoreAt: null, answer: null })).toBe(false);
    expect(shouldAskDidYouBuy(null)).toBe(false);
  });
});
