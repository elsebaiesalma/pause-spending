import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Ids only.
export type StoredOutfit = { itemIds: string[] };

const storedOutfitsSchema = z.array(z.object({ itemIds: z.array(z.string()) }));

// Every query is scoped by userId. A desiredItemId of null is the Lookbook's
// open suggestion.
export async function readStoredOutfits(
  userId: string,
  desiredItemId: string | null,
  wardrobeVersion: string,
  notBefore: Date
): Promise<StoredOutfit[] | null> {
  const row = await prisma.outfitSuggestion.findFirst({
    where: { userId, desiredItemId, wardrobeVersion, createdAt: { gt: notBefore } },
    select: { outfits: true },
  });
  if (!row) return null;
  const parsed = storedOutfitsSchema.safeParse(row.outfits);
  return parsed.success ? parsed.data : null;
}

// Replaces any earlier row for the same user and wanted item, so a changed
// wardrobe doesn't leave stale versions behind.
export async function writeStoredOutfits(
  userId: string,
  desiredItemId: string | null,
  wardrobeVersion: string,
  outfits: StoredOutfit[],
  at: Date
): Promise<void> {
  await prisma.outfitSuggestion.deleteMany({ where: { userId, desiredItemId } });
  await prisma.outfitSuggestion.createMany({
    data: [{ userId, desiredItemId, wardrobeVersion, outfits, createdAt: at }],
    skipDuplicates: true,
  });
}
