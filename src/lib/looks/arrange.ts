import { categoryKeyOf } from "@/lib/wardrobeView";
import { normalizePlacement, type LookPlacement } from "./placements";

// Lays a suggested outfit out on the board like a flat-lay: what you wear on
// top near the top, bottoms beneath, shoes at the foot, a bag and accessories
// off to the side. Deterministic, so a suggestion always opens the same way.
// Every piece stays fully on the board (see the slot arithmetic in the tests).

type Slot = { x: number; y: number; scale: number };

// Slot for the nth piece (0-based) of each role. A piece is as tall as it is
// wide on a 4:5 board with 4:5 cards, so y + scale must stay at or under 1.
const SLOTS: Record<string, Slot[]> = {
  tops: [
    { x: 0.1, y: 0.04, scale: 0.4 },
    { x: 0.5, y: 0.04, scale: 0.4 },
  ],
  knitwear: [
    { x: 0.1, y: 0.04, scale: 0.4 },
    { x: 0.5, y: 0.04, scale: 0.4 },
  ],
  outerwear: [
    { x: 0.48, y: 0.08, scale: 0.42 },
    { x: 0.08, y: 0.08, scale: 0.42 },
  ],
  dresses: [
    { x: 0.22, y: 0.05, scale: 0.5 },
    { x: 0.5, y: 0.1, scale: 0.4 },
  ],
  bottoms: [
    { x: 0.2, y: 0.4, scale: 0.42 },
    { x: 0.5, y: 0.42, scale: 0.36 },
  ],
  shoes: [
    { x: 0.1, y: 0.72, scale: 0.26 },
    { x: 0.4, y: 0.72, scale: 0.26 },
  ],
  bags: [{ x: 0.64, y: 0.6, scale: 0.3 }],
  accessories: [
    { x: 0.66, y: 0.3, scale: 0.24 },
    { x: 0.7, y: 0.64, scale: 0.22 },
  ],
  other: [
    { x: 0.64, y: 0.5, scale: 0.28 },
    { x: 0.12, y: 0.7, scale: 0.26 },
  ],
};

// Back to front: outer layers sit under what they open over, accessories on top.
const DRAW_ORDER = ["outerwear", "dresses", "bottoms", "tops", "knitwear", "shoes", "bags", "accessories", "other"];

export function arrangeOutfit(pieces: readonly { id: string; category: string | null }[]): LookPlacement[] {
  const used = new Map<string, number>();
  const placed = pieces.map((piece) => {
    const role = categoryKeyOf(piece.category);
    const slots = SLOTS[role] ?? SLOTS.other;
    const nth = used.get(role) ?? 0;
    used.set(role, nth + 1);
    // Past the last defined slot, fan out gently rather than stacking exactly.
    const slot = slots[Math.min(nth, slots.length - 1)];
    const extra = Math.max(0, nth - (slots.length - 1));
    return { id: piece.id, role, slot, extra };
  });

  const order = (role: string) => {
    const index = DRAW_ORDER.indexOf(role);
    return index === -1 ? DRAW_ORDER.length : index;
  };

  return placed
    .sort((a, b) => order(a.role) - order(b.role))
    .flatMap((entry, zOrder) => {
      const normalized = normalizePlacement({
        wardrobeItemId: entry.id,
        x: entry.slot.x + entry.extra * 0.04,
        y: entry.slot.y + entry.extra * 0.03,
        scale: entry.slot.scale,
        zOrder,
      });
      return normalized ? [normalized] : [];
    });
}
