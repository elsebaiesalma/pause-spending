import { describe, expect, it } from "vitest";
import {
  addPiece,
  bringToFront,
  growPiece,
  movePiece,
  nudgePiece,
  removePiece,
  resizePiece,
  sendToBack,
  stepZ,
} from "./boardOps";
import { MAX_PIECES, MAX_SCALE, MIN_SCALE, type LookPlacement } from "./placements";

const p = (id: string, zOrder: number, extra: Partial<LookPlacement> = {}): LookPlacement => ({
  wardrobeItemId: id,
  x: 0.3,
  y: 0.3,
  scale: 0.4,
  zOrder,
  ...extra,
});

const order = (pieces: readonly LookPlacement[]) =>
  [...pieces].sort((a, b) => a.zOrder - b.zOrder).map((piece) => piece.wardrobeItemId);

describe("adding and removing", () => {
  it("adds on top, near the middle", () => {
    const next = addPiece([p("a", 0)], "b");
    expect(order(next)).toEqual(["a", "b"]);
    const b = next.find((piece) => piece.wardrobeItemId === "b")!;
    expect(b.x).toBeGreaterThan(0);
    expect(b.x + b.scale).toBeLessThan(1);
  });

  it("brings a piece already on the board to the front instead of duplicating it", () => {
    const next = addPiece([p("a", 0), p("b", 1)], "a");
    expect(next).toHaveLength(2);
    expect(order(next)).toEqual(["b", "a"]);
  });

  it("stops at the piece limit", () => {
    const full = Array.from({ length: MAX_PIECES }, (_, i) => p(`i${i}`, i));
    expect(addPiece(full, "one-more")).toHaveLength(MAX_PIECES);
  });

  it("removes a piece and keeps z-order contiguous", () => {
    const next = removePiece([p("a", 0), p("b", 1), p("c", 2)], "b");
    expect(next.map((x) => [x.wardrobeItemId, x.zOrder])).toEqual([["a", 0], ["c", 1]]);
  });
});

describe("moving", () => {
  it("moves to a position, and keeps the piece reachable on the board", () => {
    expect(movePiece([p("a", 0)], "a", 0.5, 0.1)[0]).toMatchObject({ x: 0.5, y: 0.1 });
    const far = movePiece([p("a", 0)], "a", 50, 50)[0];
    expect(far.x).toBeLessThan(1);
    expect(far.y).toBeLessThan(1);
  });

  it("nudges by a fraction of the board", () => {
    const next = nudgePiece([p("a", 0)], "a", 0.01, -0.05)[0];
    expect(next.x).toBeCloseTo(0.31);
    expect(next.y).toBeCloseTo(0.25);
  });

  it("does nothing for an id that is not on the board", () => {
    expect(nudgePiece([p("a", 0)], "zzz", 0.1, 0.1)[0]).toMatchObject({ x: 0.3, y: 0.3 });
  });
});

describe("resizing", () => {
  it("resizes around the centre so the piece does not slide", () => {
    const before = p("a", 0);
    const after = resizePiece([before], "a", 0.6)[0];
    expect(after.x + after.scale / 2).toBeCloseTo(before.x + before.scale / 2);
    expect(after.y + after.scale / 2).toBeCloseTo(before.y + before.scale / 2);
  });

  it("stays within the allowed size range", () => {
    expect(resizePiece([p("a", 0)], "a", 0.001)[0].scale).toBe(MIN_SCALE);
    expect(resizePiece([p("a", 0)], "a", 5)[0].scale).toBe(MAX_SCALE);
  });

  it("grows by a step", () => {
    expect(growPiece([p("a", 0)], "a", 0.05)[0].scale).toBeCloseTo(0.45);
    expect(growPiece([p("a", 0)], "a", -0.05)[0].scale).toBeCloseTo(0.35);
  });
});

describe("stacking order", () => {
  const three = [p("a", 0), p("b", 1), p("c", 2)];

  it("brings to front and sends to back", () => {
    expect(order(bringToFront(three, "a"))).toEqual(["b", "c", "a"]);
    expect(order(sendToBack(three, "c"))).toEqual(["c", "a", "b"]);
  });

  it("steps one place forward or back", () => {
    expect(order(stepZ(three, "a", 1))).toEqual(["b", "a", "c"]);
    expect(order(stepZ(three, "c", -1))).toEqual(["a", "c", "b"]);
  });

  it("does nothing at the ends", () => {
    expect(order(stepZ(three, "c", 1))).toEqual(["a", "b", "c"]);
    expect(order(stepZ(three, "a", -1))).toEqual(["a", "b", "c"]);
  });
});
