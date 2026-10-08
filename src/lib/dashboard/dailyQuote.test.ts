import { describe, expect, it } from "vitest";
import { quoteForDay } from "./dailyQuote";

const POOL = [
  { text: "a", source: "A" },
  { text: "b", source: "B" },
];

describe("quoteForDay", () => {
  it("returns the same quote all day and moves on the next day", () => {
    const morning = new Date("2026-10-08T01:00:00Z");
    const night = new Date("2026-10-08T23:00:00Z");
    const next = new Date("2026-10-09T01:00:00Z");
    expect(quoteForDay(morning, POOL)).toEqual(quoteForDay(night, POOL));
    expect(quoteForDay(next, POOL)).not.toEqual(quoteForDay(morning, POOL));
  });

  it("defaults to the shipped pool, every entry with text and source", () => {
    const quote = quoteForDay(new Date());
    expect(quote.text.length).toBeGreaterThan(0);
    expect(quote.source.length).toBeGreaterThan(0);
  });
});
