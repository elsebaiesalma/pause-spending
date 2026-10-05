import { prisma } from "@/lib/prisma";
import type { ParsedReflection } from "./reflectionForm";

export { REFLECTION_NOTHING_VALUE, hasAnyReflectionAnswer, parseReflectionFromForm } from "./reflectionForm";
export type { ParsedReflection } from "./reflectionForm";

export type ReflectionAnswer = ParsedReflection & { answeredAt: Date };

// Persists via raw SQL against the columns proposed in
// prisma/migrations/20260925090000_add_desired_item_reflection - deliberately
// NOT the generated Prisma Client, and NOT yet applied to either database.
// This keeps every other desired_items query in the app completely
// unaffected by that migration being pending. Failure (today: "column does
// not exist") is swallowed rather than thrown, because the caller is always
// also saving the actual Pause/Let it go/Buy anyway outcome in the same
// request, and that must keep working regardless of whether this migration
// has landed yet - reflection answers just don't persist until it has. This
// is not a general error-swallowing pattern; it exists only because that
// gap is real and expected right now, and is logged so it stays visible.
export async function saveReflectionAnswer(id: string, userId: string, answer: ParsedReflection): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "desired_items"
      SET
        "reflection_replaces_wardrobe_item_id" = ${answer.replacesWardrobeItemId}::uuid,
        "reflection_replaces_nothing" = ${answer.replacesNothing},
        "reflection_need_score" = ${answer.needScore},
        "reflection_reason_for" = ${answer.reasonFor},
        "reflection_reason_against" = ${answer.reasonAgainst},
        "reflection_answered_at" = now()
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
  } catch (error) {
    console.error(
      "[reflection] not saved - prisma/migrations/20260925090000_add_desired_item_reflection isn't applied yet:",
      error
    );
  }
}

type ReflectionRow = {
  reflection_replaces_wardrobe_item_id: string | null;
  reflection_replaces_nothing: boolean;
  reflection_need_score: number | null;
  reflection_reason_for: string | null;
  reflection_reason_against: string | null;
  reflection_answered_at: Date | null;
};

// Returns null both when nothing has been answered yet and when the
// migration above hasn't landed yet - the pause screen renders identically
// (a blank reflection form) either way.
export async function getReflectionAnswer(id: string, userId: string): Promise<ReflectionAnswer | null> {
  try {
    const rows = await prisma.$queryRaw<ReflectionRow[]>`
      SELECT
        "reflection_replaces_wardrobe_item_id",
        "reflection_replaces_nothing",
        "reflection_need_score",
        "reflection_reason_for",
        "reflection_reason_against",
        "reflection_answered_at"
      FROM "desired_items"
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
    const row = rows[0];
    if (!row?.reflection_answered_at) {
      return null;
    }
    return {
      replacesWardrobeItemId: row.reflection_replaces_wardrobe_item_id,
      replacesNothing: row.reflection_replaces_nothing,
      needScore: row.reflection_need_score,
      reasonFor: row.reflection_reason_for,
      reasonAgainst: row.reflection_reason_against,
      answeredAt: row.reflection_answered_at,
    };
  } catch (error) {
    console.error(
      "[reflection] not read - prisma/migrations/20260925090000_add_desired_item_reflection isn't applied yet:",
      error
    );
    return null;
  }
}
