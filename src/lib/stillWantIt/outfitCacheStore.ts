import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Ids only, same shape the in-memory cache holds.
export type StoredOutfit = { itemIds: string[] };

const storedOutfitsSchema = z.array(z.object({ itemIds: z.array(z.string()) }));

// Raw SQL, not the generated Prisma Client: the table is proposed in
// prisma/manual/outfit-suggestions.sql and is not on both branches yet. Every
// function here degrades (never throws) when it is missing, and the caller
// then uses its in-memory cache. Every query is scoped by userId.
let warned = false;
function warnOnce(error: unknown): void {
  if (warned) return;
  warned = true;
  console.error("[outfits] durable cache unavailable - prisma/manual/outfit-suggestions.sql isn't applied yet:", error);
}

export async function readStoredOutfits(
  userId: string,
  desiredItemId: string | null,
  wardrobeVersion: string,
  notBefore: Date
): Promise<StoredOutfit[] | null> {
  try {
    const rows = await prisma.$queryRaw<{ outfits: unknown }[]>`
      SELECT "outfits" FROM "outfit_suggestions"
      WHERE "user_id" = ${userId}::uuid
        AND "desired_item_id" IS NOT DISTINCT FROM ${desiredItemId}::uuid
        AND "wardrobe_version" = ${wardrobeVersion}
        AND "created_at" > ${notBefore}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const parsed = storedOutfitsSchema.safeParse(rows[0].outfits);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    warnOnce(error);
    return null;
  }
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
  try {
    await prisma.$executeRaw`
      DELETE FROM "outfit_suggestions"
      WHERE "user_id" = ${userId}::uuid
        AND "desired_item_id" IS NOT DISTINCT FROM ${desiredItemId}::uuid
    `;
    await prisma.$executeRaw`
      INSERT INTO "outfit_suggestions" ("user_id", "desired_item_id", "wardrobe_version", "outfits", "created_at")
      VALUES (${userId}::uuid, ${desiredItemId}::uuid, ${wardrobeVersion}, ${JSON.stringify(outfits)}::jsonb, ${at})
      ON CONFLICT DO NOTHING
    `;
  } catch (error) {
    warnOnce(error);
  }
}
