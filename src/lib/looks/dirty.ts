import type { LookPlacement } from "./placements";

// A stable fingerprint of what would be saved: the name and each piece's id,
// place, size and stacking. Order of the array does not matter and positions
// are compared to four decimals, so a drag that ends where it began (or a
// resize back to the same size) is not a change.
export function boardSignature(name: string, pieces: readonly LookPlacement[]): string {
  const round = (n: number) => Math.round(n * 10_000) / 10_000;
  const rows = [...pieces]
    .sort((a, b) => a.wardrobeItemId.localeCompare(b.wardrobeItemId))
    .map((p) => [p.wardrobeItemId, round(p.x), round(p.y), round(p.scale), p.zOrder]);
  return JSON.stringify([name.trim(), rows]);
}

export function hasUnsavedChanges(
  saved: { name: string; pieces: readonly LookPlacement[] },
  current: { name: string; pieces: readonly LookPlacement[] }
): boolean {
  return boardSignature(saved.name, saved.pieces) !== boardSignature(current.name, current.pieces);
}
