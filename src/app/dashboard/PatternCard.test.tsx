import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildPausePattern, type FinishedPause } from "@/lib/dashboard/pausePattern";
import { PatternCard } from "./PatternCard";

const START = new Date("2026-10-01T12:00:00Z");

function many(hours: number, letGo: number, bought: number): FinishedPause[] {
  const make = (outcome: FinishedPause["outcome"]) => ({
    pausedAt: START,
    waitUntil: new Date(START.getTime() + hours * 3_600_000),
    outcome,
  });
  return [
    ...Array.from({ length: letGo }, () => make("dropped")),
    ...Array.from({ length: bought }, () => make("proceeded")),
  ];
}

describe("PatternCard", () => {
  it("renders nothing before the first finished pause", () => {
    expect(renderToStaticMarkup(<PatternCard pattern={buildPausePattern([])} />)).toBe("");
  });

  it("shows progress toward 5 pauses before the pattern is ready", () => {
    const html = renderToStaticMarkup(<PatternCard pattern={buildPausePattern(many(24, 2, 0))} />);

    expect(html).toContain("Your pattern shows up after 5 pauses");
    expect(html).toContain("PAUSE compares how often you let things go after 24 hours and after 7 days.");
    expect(html).toContain("2 of 5 pauses");
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain('aria-valuemax="5"');
  });

  it("shows counts, 7-day first, with a headline and the tip when longer pauses work better", () => {
    const html = renderToStaticMarkup(
      <PatternCard pattern={buildPausePattern([...many(24, 1, 2), ...many(168, 3, 0)])} />
    );

    expect(html).toContain("Longer pauses work better for you");
    expect(html).toContain("Let go 3 of 3");
    expect(html).toContain("Let go 1 of 3");
    expect(html.indexOf("7-day pauses")).toBeLessThan(html.indexOf("24-hour pauses"));
    expect(html).toContain("Based on your 6 finished pauses. Try 7 days for the things you want most.");
    expect(html).toContain('role="progressbar"');
  });

  it("never shows a percentage", () => {
    const html = renderToStaticMarkup(
      <PatternCard pattern={buildPausePattern([...many(24, 1, 2), ...many(168, 3, 0)])} />
    );

    expect(html).not.toContain("%");
  });

  it("skips a bucket with no pauses and uses the neutral headline", () => {
    const html = renderToStaticMarkup(<PatternCard pattern={buildPausePattern(many(24, 3, 3))} />);

    expect(html).toContain("How your pauses ended");
    expect(html).toContain("24-hour pauses");
    expect(html).not.toContain("7-day pauses");
    expect(html).toContain("Based on your 6 finished pauses.");
    expect(html).not.toContain("Try 7 days");
  });
});
