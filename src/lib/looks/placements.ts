// Pure helpers for look boards: names and placement validation. A look's
// pieces sit on a portrait 4:5 board; x and y are the piece's top-left corner
// as a fraction of the board's width and height, scale is the piece's width as
// a fraction of the board's width, and a higher zOrder draws on top.

export const BOARD_ASPECT = 4 / 5; // width / height
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 1;
export const MAX_PIECES = 24;

// A piece is a 4:5 photo card on a 4:5 board, so its height is a fraction of
// the board's height equal to its width fraction (scale).
export const PIECE_HEIGHT_PER_SCALE = 1;

export type LookPlacement = {
  wardrobeItemId: string;
  x: number;
  y: number;
  scale: number;
  zOrder: number;
};

// "Look 01", "Look 02"... one past the highest number already used, so
// deleting an earlier look never makes the next one reuse a name.
export function nextLookName(existingNames: readonly string[]): string {
  let highest = 0;
  for (const name of existingNames) {
    const match = /^Look (\d+)$/.exec(name.trim());
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `Look ${String(highest + 1).padStart(2, "0")}`;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Pulls a placement back onto a sensible board: finite numbers, a size in
// range, and the piece mostly on the board (at least a third of it visible
// each way, so it can always be grabbed again).
export function normalizePlacement(raw: LookPlacement): LookPlacement | null {
  const { wardrobeItemId, x, y, scale, zOrder } = raw;
  if (typeof wardrobeItemId !== "string" || ![x, y, scale, zOrder].every(Number.isFinite)) return null;
  const size = clamp(scale, MIN_SCALE, MAX_SCALE);
  const height = size * PIECE_HEIGHT_PER_SCALE;
  return {
    wardrobeItemId,
    scale: size,
    x: clamp(x, -size * 0.66, 1 - size * 0.34),
    y: clamp(y, -height * 0.66, 1 - height * 0.34),
    zOrder: Math.round(zOrder),
  };
}
