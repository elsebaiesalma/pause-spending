import { prisma } from "@/lib/prisma";
import { MAX_PIECES, nextLookName, normalizePlacement, type LookPlacement } from "./placements";

// Every function takes the session user's id and scopes every query by it.
// A look, every piece on it and the wanted item it was built for must all
// belong to that user. The database enforces the first two (composite foreign
// keys); the checks below enforce all three before anything is written, so a
// foreign id is rejected with a clear error.

export class ForeignItemError extends Error {
  constructor() {
    super("One or more pieces are not in this wardrobe");
    this.name = "ForeignItemError";
  }
}

export class LookNotFoundError extends Error {
  constructor() {
    super("Look not found");
    this.name = "LookNotFoundError";
  }
}

export type LookPiece = {
  id: string;
  wardrobeItemId: string;
  x: number;
  y: number;
  scale: number;
  zOrder: number;
  imageUrl: string | null;
  name: string;
  category: string | null;
};

export type LookSummary = {
  id: string;
  name: string;
  createdAt: Date;
  // "Built instead of [item name]": the wanted item's name, or null when the
  // look was not built at a moment of temptation, or the wanted item is gone
  // or has no name. Text only, never the item's photo.
  builtInstead: string | null;
  inspiredByDesiredItemId: string | null;
  pieces: LookPiece[];
};

const LOOK_INCLUDE = {
  inspiredBy: { select: { itemName: true } },
  items: {
    orderBy: { zOrder: "asc" },
    include: { wardrobeItem: { select: { itemName: true, imageUrl: true, category: true } } },
  },
} as const;

type LookRow = {
  id: string;
  name: string;
  createdAt: Date;
  inspiredByDesiredItemId: string | null;
  inspiredBy: { itemName: string | null } | null;
  items: {
    id: string;
    wardrobeItemId: string;
    x: number;
    y: number;
    scale: number;
    zOrder: number;
    wardrobeItem: { itemName: string; imageUrl: string | null; category: string | null };
  }[];
};

function toSummary(look: LookRow): LookSummary {
  const wanted = look.inspiredBy?.itemName?.trim();
  return {
    id: look.id,
    name: look.name,
    createdAt: look.createdAt,
    builtInstead: wanted ? wanted : null,
    inspiredByDesiredItemId: look.inspiredByDesiredItemId,
    pieces: look.items.map((item) => ({
      id: item.id,
      wardrobeItemId: item.wardrobeItemId,
      x: item.x,
      y: item.y,
      scale: item.scale,
      zOrder: item.zOrder,
      imageUrl: item.wardrobeItem.imageUrl,
      name: item.wardrobeItem.itemName,
      category: item.wardrobeItem.category,
    })),
  };
}

// A look with no pieces left (every wardrobe item on it was deleted) is not a
// look any more: it is removed, so it can never show up as a blank card.
export async function deleteEmptyLooks(userId: string): Promise<number> {
  const result = await prisma.look.deleteMany({ where: { userId, items: { none: {} } } });
  return result.count;
}

export async function listLooks(userId: string): Promise<LookSummary[]> {
  await deleteEmptyLooks(userId);
  const looks = await prisma.look.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: LOOK_INCLUDE,
  });
  return looks.map(toSummary);
}

export async function getLook(userId: string, lookId: string): Promise<LookSummary | null> {
  const look = await prisma.look.findFirst({ where: { id: lookId, userId }, include: LOOK_INCLUDE });
  return look ? toSummary(look) : null;
}

async function assertOwnsWardrobeItems(userId: string, ids: string[]): Promise<void> {
  const owned = await prisma.wardrobeItem.count({ where: { userId, id: { in: ids } } });
  if (owned !== ids.length) throw new ForeignItemError();
}

async function assertOwnsDesiredItem(userId: string, id: string): Promise<void> {
  const owned = await prisma.desiredItem.count({ where: { userId, id } });
  if (owned !== 1) throw new ForeignItemError();
}

export type SaveLookInput = {
  // Omit to create a new look; pass an id to replace that look's pieces.
  lookId?: string;
  name?: string;
  inspiredByDesiredItemId?: string | null;
  placements: LookPlacement[];
};

// Saves a board and returns the look's id. A board with no pieces is not
// saved (and removes the look it was editing), so an empty look never exists;
// null is returned in that case.
export async function saveLook(userId: string, input: SaveLookInput): Promise<string | null> {
  const placements = input.placements
    .map(normalizePlacement)
    .filter((p): p is LookPlacement => p !== null)
    .slice(0, MAX_PIECES);
  // A piece appears once per look: the last placement for an id wins.
  const pieces = [...new Map(placements.map((p) => [p.wardrobeItemId, p])).values()];

  if (pieces.length === 0) {
    if (input.lookId) await prisma.look.deleteMany({ where: { id: input.lookId, userId } });
    return null;
  }

  await assertOwnsWardrobeItems(userId, pieces.map((p) => p.wardrobeItemId));
  if (input.inspiredByDesiredItemId) await assertOwnsDesiredItem(userId, input.inspiredByDesiredItemId);

  const rows = pieces.map((p) => ({
    wardrobeItemId: p.wardrobeItemId,
    userId,
    x: p.x,
    y: p.y,
    scale: p.scale,
    zOrder: p.zOrder,
  }));

  if (input.lookId) {
    const existing = await prisma.look.findFirst({ where: { id: input.lookId, userId }, select: { id: true } });
    if (!existing) throw new LookNotFoundError();
    const lookId = input.lookId;
    // Pieces are written with createMany, not a nested create: the owner
    // column is shared by two composite keys, which nested writes cannot set.
    await prisma.$transaction([
      prisma.lookItem.deleteMany({ where: { lookId, userId } }),
      prisma.lookItem.createMany({ data: rows.map((row) => ({ ...row, lookId })) }),
      prisma.look.update({
        where: { id: lookId },
        data: {
          ...(input.name?.trim() ? { name: input.name.trim().slice(0, 60) } : {}),
          ...(input.inspiredByDesiredItemId !== undefined
            ? { inspiredByDesiredItemId: input.inspiredByDesiredItemId }
            : {}),
        },
      }),
    ]);
    return lookId;
  }

  const names = await prisma.look.findMany({ where: { userId }, select: { name: true } });
  // The look and its pieces are written together, so a look never exists
  // without pieces, even for an instant.
  return prisma.$transaction(async (tx) => {
    const created = await tx.look.create({
      data: {
        userId,
        name: input.name?.trim().slice(0, 60) || nextLookName(names.map((n) => n.name)),
        inspiredByDesiredItemId: input.inspiredByDesiredItemId ?? null,
      },
      select: { id: true },
    });
    await tx.lookItem.createMany({ data: rows.map((row) => ({ ...row, lookId: created.id })) });
    return created.id;
  });
}

export async function renameLook(userId: string, lookId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const result = await prisma.look.updateMany({ where: { id: lookId, userId }, data: { name: trimmed.slice(0, 60) } });
  if (result.count === 0) throw new LookNotFoundError();
}

export async function deleteLook(userId: string, lookId: string): Promise<void> {
  const result = await prisma.look.deleteMany({ where: { id: lookId, userId } });
  if (result.count === 0) throw new LookNotFoundError();
}

// True when the person has saved a look for this wanted item. The pause
// screen counts that as a reflection answer.
export async function hasLookForDesiredItem(userId: string, desiredItemId: string): Promise<boolean> {
  await deleteEmptyLooks(userId);
  return (await prisma.look.count({ where: { userId, inspiredByDesiredItemId: desiredItemId } })) > 0;
}
