import { describe, expect, it } from "vitest";
import { boardSignature, hasUnsavedChanges } from "./dirty";
import type { LookPlacement } from "./placements";

const p = (id: string, extra: Partial<LookPlacement> = {}): LookPlacement => ({
  wardrobeItemId: id,
  x: 0.2,
  y: 0.3,
  scale: 0.4,
  zOrder: 0,
  ...extra,
});

describe("hasUnsavedChanges", () => {
  const saved = { name: "Dinner", pieces: [p("a"), p("b", { zOrder: 1 })] };

  it("is false for the same board, in any order", () => {
    expect(hasUnsavedChanges(saved, { name: "Dinner", pieces: [p("b", { zOrder: 1 }), p("a")] })).toBe(false);
  });

  it("is true after a piece is moved, resized, restacked, added or removed", () => {
    expect(hasUnsavedChanges(saved, { name: "Dinner", pieces: [p("a", { x: 0.25 }), p("b", { zOrder: 1 })] })).toBe(true);
    expect(hasUnsavedChanges(saved, { name: "Dinner", pieces: [p("a", { scale: 0.5 }), p("b", { zOrder: 1 })] })).toBe(true);
    expect(hasUnsavedChanges(saved, { name: "Dinner", pieces: [p("a", { zOrder: 1 }), p("b", { zOrder: 0 })] })).toBe(true);
    expect(hasUnsavedChanges(saved, { name: "Dinner", pieces: [...saved.pieces, p("c", { zOrder: 2 })] })).toBe(true);
    expect(hasUnsavedChanges(saved, { name: "Dinner", pieces: [p("a")] })).toBe(true);
  });

  it("is true when the name changes, but not for stray spaces around it", () => {
    expect(hasUnsavedChanges(saved, { name: "Dinner out", pieces: saved.pieces })).toBe(true);
    expect(hasUnsavedChanges(saved, { name: "  Dinner ", pieces: saved.pieces })).toBe(false);
  });

  it("is false when a drag ends where it began", () => {
    expect(hasUnsavedChanges(saved, { name: "Dinner", pieces: [p("a", { x: 0.20000001 }), p("b", { zOrder: 1 })] })).toBe(false);
  });

  it("treats a board with nothing changed from an empty start as clean", () => {
    expect(hasUnsavedChanges({ name: "", pieces: [] }, { name: "", pieces: [] })).toBe(false);
    expect(boardSignature("", [])).toBe(boardSignature(" ", []));
  });
});
