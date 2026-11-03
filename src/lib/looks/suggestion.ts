import type { LookPlacement } from "./placements";

// How long the server waits for the model before giving up on a suggestion.
// The board is already open by then; this only bounds how long it says
// "Styling a suggestion".
export const SUGGESTION_TIMEOUT_MS = 6_000;

export type SuggestionResult =
  | { status: "ok"; pieces: LookPlacement[] }
  | { status: "too_small" | "unavailable" | "none" };

export const SUGGESTION_NOTICES: Record<Exclude<SuggestionResult["status"], "ok">, string> = {
  too_small: "Not enough pieces yet for a suggestion. Add some from your closet.",
  unavailable: "A suggestion couldn't load just now.",
  none: "No suggestion this time.",
};

export type SuggestionOutcome = {
  pieces: LookPlacement[];
  // The quiet line to show, if any.
  notice: string | null;
  // Whether the suggestion was placed on the board.
  placed: boolean;
};

// What happens when a suggestion arrives. If the person has not touched
// anything it is placed (or, when there is none, a quiet line says so). If they
// have already started, their work is never overwritten: the suggestion is
// dropped, and so is any "no suggestion" notice, since they moved on without it.
export function receiveSuggestion(
  state: { touched: boolean; pieces: LookPlacement[] },
  result: SuggestionResult
): SuggestionOutcome {
  if (state.touched) return { pieces: state.pieces, notice: null, placed: false };
  if (result.status === "ok" && result.pieces.length > 0) {
    return { pieces: result.pieces, notice: null, placed: true };
  }
  const status = result.status === "ok" ? "none" : result.status;
  return { pieces: state.pieces, notice: SUGGESTION_NOTICES[status], placed: false };
}
