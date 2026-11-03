import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { MonthlyRecapData } from "@/lib/dashboard/monthlyRecap";
import {
  dismiss,
  dismissKey,
  isDismissed,
  resetDismissalMemory,
  subscribeDismissals,
} from "@/lib/dashboard/dismissStore";
import { MonthlyRecap } from "./MonthlyRecap";

const RECAP: MonthlyRecapData = {
  monthKey: "2026-10",
  monthLabel: "October",
  comparison: "2 more than September",
  stats: { confirmed: 5, paused: 5, letGo: 2, saved: 240, mostResisted: { label: "Shoes", count: 2 } },
};

describe("MonthlyRecap", () => {
  it("shows the month, all four metrics and the neutral comparison under Paused", () => {
    const html = renderToStaticMarkup(<MonthlyRecap recap={RECAP} />);

    expect(html).toContain("Your month");
    expect(html).toContain("Your October in PAUSE");
    expect(html).toMatch(/Paused<\/dt><dd>5<\/dd><dd[^>]*>2 more than September/);
    expect(html).toMatch(/Let go<\/dt><dd>2<\/dd>/);
    expect(html).toMatch(/Saved<\/dt><dd[^>]*>\$240/);
    expect(html).toMatch(/Most resisted<\/dt><dd[^>]*>Shoes<\/dd><dd[^>]*>2 let go/);
  });

  it("leaves out the comparison when there is none, and never uses win or lose wording", () => {
    const html = renderToStaticMarkup(<MonthlyRecap recap={{ ...RECAP, comparison: null }} />);

    expect(html).not.toContain("than ");
    expect(html).not.toMatch(/\b(win|won|lose|lost|beat)\b/i);
  });

  it("links to the let-go decisions with the month named", () => {
    const html = renderToStaticMarkup(<MonthlyRecap recap={RECAP} />);

    expect(html).toContain('href="/considering?tab=let-go"');
    expect(html).toContain("See October’s decisions");
  });

  it("has a labelled dismiss button and is visible on the server", () => {
    const html = renderToStaticMarkup(<MonthlyRecap recap={RECAP} />);

    expect(html).toContain('aria-label="Dismiss your October recap"');
    expect(html).toContain('data-dismissed="false"');
    expect(html).toContain('aria-hidden="false"');
  });

  it("says nothing resisted yet when nothing was let go", () => {
    const html = renderToStaticMarkup(
      <MonthlyRecap recap={{ ...RECAP, stats: { ...RECAP.stats, letGo: 0, saved: 0, mostResisted: null } }} />
    );

    expect(html).toContain("Nothing yet");
  });
});

describe("dismissal memory", () => {
  const KEY = dismissKey("2026-10");

  function stubWindow(storage: Pick<Storage, "getItem" | "setItem">) {
    vi.stubGlobal("window", {
      localStorage: storage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  }

  beforeEach(() => resetDismissalMemory());
  afterEach(() => vi.unstubAllGlobals());

  it("remembers a dismissal per month in localStorage", () => {
    const data = new Map<string, string>();
    stubWindow({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) });

    expect(isDismissed(KEY)).toBe(false);
    dismiss(KEY);

    expect(data.get(KEY)).toBe("1");
    expect(isDismissed(KEY)).toBe(true);
    expect(isDismissed(dismissKey("2026-11"))).toBe(false);
  });

  it("notifies subscribers so the card folds away", () => {
    stubWindow({ getItem: () => null, setItem: () => undefined });
    const listener = vi.fn();
    const unsubscribe = subscribeDismissals(listener);

    dismiss(KEY);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    dismiss(dismissKey("2026-11"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("still dismisses for this visit, and never throws, when storage is unavailable", () => {
    stubWindow({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });

    expect(isDismissed(KEY)).toBe(false);
    expect(() => dismiss(KEY)).not.toThrow();
    expect(isDismissed(KEY)).toBe(true);
  });
});
