import { describe, expect, it } from "vitest";
import { SUGGESTION_NOTICES, SUGGESTION_TIMEOUT_MS, receiveSuggestion, type SuggestionResult } from "./suggestion";
import type { LookPlacement } from "./placements";

const piece = (id: string): LookPlacement => ({ wardrobeItemId: id, x: 0.1, y: 0.1, scale: 0.3, zOrder: 0 });
const arrived: SuggestionResult = { status: "ok", pieces: [piece("suggested")] };

describe("receiveSuggestion", () => {
  it("places the suggestion when nothing has been touched", () => {
    expect(receiveSuggestion({ touched: false, pieces: [] }, arrived)).toEqual({
      pieces: [piece("suggested")],
      notice: null,
      placed: true,
    });
  });

  it("never overwrites work already started: the suggestion is dropped", () => {
    const mine = [piece("mine")];
    expect(receiveSuggestion({ touched: true, pieces: mine }, arrived)).toEqual({ pieces: mine, notice: null, placed: false });
  });

  it("drops it even if the person has only cleared the board", () => {
    expect(receiveSuggestion({ touched: true, pieces: [] }, arrived).pieces).toEqual([]);
  });

  it("says so quietly when there is no suggestion and nothing was touched", () => {
    for (const status of ["too_small", "unavailable", "none"] as const) {
      expect(receiveSuggestion({ touched: false, pieces: [] }, { status })).toEqual({
        pieces: [],
        notice: SUGGESTION_NOTICES[status],
        placed: false,
      });
    }
  });

  it("stays silent about a missing suggestion once the person has moved on", () => {
    expect(receiveSuggestion({ touched: true, pieces: [piece("mine")] }, { status: "unavailable" }).notice).toBeNull();
  });

  it("treats an ok result with no pieces as no suggestion", () => {
    expect(receiveSuggestion({ touched: false, pieces: [] }, { status: "ok", pieces: [] }).notice).toBe(SUGGESTION_NOTICES.none);
  });

  it("waits about six seconds at most", () => {
    expect(SUGGESTION_TIMEOUT_MS).toBe(6000);
  });
});
