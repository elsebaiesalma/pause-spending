import {
  MAX_PIECES,
  MAX_SCALE,
  MIN_SCALE,
  PIECE_HEIGHT_PER_SCALE,
  normalizePlacement,
  type LookPlacement,
} from "./placements";

// Pure edits on a board's pieces, shared by dragging, the buttons and the
// keyboard so every way of changing a look does exactly the same thing. All of
// them return a new array and renumber zOrder 0..n-1 (back to front).

export type Pieces = readonly LookPlacement[];

function renumber(pieces: Pieces): LookPlacement[] {
  return [...pieces]
    .sort((a, b) => a.zOrder - b.zOrder)
    .map((piece, index) => ({ ...piece, zOrder: index }));
}

function update(pieces: Pieces, id: string, change: (piece: LookPlacement) => LookPlacement): LookPlacement[] {
  return renumber(pieces.map((piece) => (piece.wardrobeItemId === id ? change(piece) : piece)));
}

export function topZ(pieces: Pieces): number {
  return pieces.reduce((max, piece) => Math.max(max, piece.zOrder), -1);
}

// Adds a piece near the middle, on top. Adding one already on the board just
// brings it to the front.
export function addPiece(pieces: Pieces, wardrobeItemId: string, scale = 0.4): LookPlacement[] {
  if (pieces.some((piece) => piece.wardrobeItemId === wardrobeItemId)) return bringToFront(pieces, wardrobeItemId);
  if (pieces.length >= MAX_PIECES) return renumber(pieces);
  // Stagger so a second and third piece do not land exactly on the first.
  const offset = (pieces.length % 5) * 0.04;
  const placed = normalizePlacement({
    wardrobeItemId,
    scale,
    x: 0.5 - scale / 2 + offset - 0.08,
    y: 0.5 - (scale * PIECE_HEIGHT_PER_SCALE) / 2 + offset - 0.08,
    zOrder: topZ(pieces) + 1,
  }) as LookPlacement;
  return renumber([...pieces, placed]);
}

export function removePiece(pieces: Pieces, id: string): LookPlacement[] {
  return renumber(pieces.filter((piece) => piece.wardrobeItemId !== id));
}

export function movePiece(pieces: Pieces, id: string, x: number, y: number): LookPlacement[] {
  return update(pieces, id, (piece) => normalizePlacement({ ...piece, x, y }) ?? piece);
}

// Moves by a fraction of the board (so 0.01 is 1% of its width or height).
export function nudgePiece(pieces: Pieces, id: string, dx: number, dy: number): LookPlacement[] {
  const piece = pieces.find((p) => p.wardrobeItemId === id);
  return piece ? movePiece(pieces, id, piece.x + dx, piece.y + dy) : renumber(pieces);
}

// Sets the width as a fraction of the board, growing and shrinking around the
// piece's centre so it does not appear to slide.
export function resizePiece(pieces: Pieces, id: string, scale: number): LookPlacement[] {
  return update(pieces, id, (piece) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const centreX = piece.x + piece.scale / 2;
    const centreY = piece.y + (piece.scale * PIECE_HEIGHT_PER_SCALE) / 2;
    return (
      normalizePlacement({
        ...piece,
        scale: next,
        x: centreX - next / 2,
        y: centreY - (next * PIECE_HEIGHT_PER_SCALE) / 2,
      }) ?? piece
    );
  });
}

export function growPiece(pieces: Pieces, id: string, step = 0.05): LookPlacement[] {
  const piece = pieces.find((p) => p.wardrobeItemId === id);
  return piece ? resizePiece(pieces, id, piece.scale + step) : renumber(pieces);
}

export function bringToFront(pieces: Pieces, id: string): LookPlacement[] {
  return update(pieces, id, (piece) => ({ ...piece, zOrder: topZ(pieces) + 1 }));
}

export function sendToBack(pieces: Pieces, id: string): LookPlacement[] {
  return update(pieces, id, (piece) => ({ ...piece, zOrder: -1 }));
}

// One step forward or back: swaps with the neighbour in that direction.
export function stepZ(pieces: Pieces, id: string, direction: 1 | -1): LookPlacement[] {
  const ordered = renumber(pieces);
  const index = ordered.findIndex((piece) => piece.wardrobeItemId === id);
  const swapWith = index + direction;
  if (index === -1 || swapWith < 0 || swapWith >= ordered.length) return ordered;
  const next = ordered.map((piece) => ({ ...piece }));
  next[index].zOrder = swapWith;
  next[swapWith].zOrder = index;
  return renumber(next);
}
