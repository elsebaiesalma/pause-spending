import { prisma } from "@/lib/prisma";

export const SAVED_RETENTION_DAYS = 60;

export type ConsideringMeta = {
  pausedAt: Date | null;
  savedAt: Date | null;
  letGoAutomatically: boolean;
  letGoAt: Date | null;
};

type Row = {
  id: string;
  paused_at: Date | null;
  saved_at: Date | null;
  let_go_automatically: boolean;
  let_go_at: Date | null;
};

// Raw SQL, not the generated Prisma Client - these columns are proposed in
// prisma/migrations/20260925100000_add_desired_item_considering_lifecycle,
// not yet applied to either database (see that file's header). Every
// function here gracefully degrades (never throws) when it isn't applied
// yet, so every caller falls back to whatever it already has (createdAt,
// no sweep, etc.) rather than breaking. This keeps every other desired_items
// query in the app completely unaffected by this migration being pending.
export async function getConsideringMeta(ids: string[]): Promise<Record<string, ConsideringMeta>> {
  if (ids.length === 0) return {};
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT "id", "paused_at", "saved_at", "let_go_automatically", "let_go_at"
      FROM "desired_items"
      WHERE "id" = ANY(${ids}::uuid[])
    `;
    const result: Record<string, ConsideringMeta> = {};
    for (const row of rows) {
      result[row.id] = {
        pausedAt: row.paused_at,
        savedAt: row.saved_at,
        letGoAutomatically: row.let_go_automatically,
        letGoAt: row.let_go_at,
      };
    }
    return result;
  } catch (error) {
    console.error("[considering] meta not read - migration 20260925100000 isn't applied yet:", error);
    return {};
  }
}

// Called by the wait endpoint whenever a pause starts.
export async function markPaused(id: string, userId: string, at: Date): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "desired_items" SET "paused_at" = ${at}
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
  } catch (error) {
    console.error("[considering] pausedAt not saved - migration 20260925100000 isn't applied yet:", error);
  }
}

// Called whenever an item (re-)enters "saved for later" - the initial save
// (resolve endpoint, outcome saved_for_later) and a restore from let-go.
// Clears any previous let-go marking, since restoring means it's no longer
// let go at all.
export async function markSaved(id: string, userId: string, at: Date): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "desired_items"
      SET "saved_at" = ${at}, "let_go_automatically" = false, "let_go_at" = NULL
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
  } catch (error) {
    console.error("[considering] savedAt not saved - migration 20260925100000 isn't applied yet:", error);
    return;
  }
  await clearPauseEnded(id, userId);
}

// Called whenever an item becomes decisionOutcome "dropped" via the normal,
// user-initiated resolve endpoint - always automatic: false. The 60-day
// sweep below sets these same two columns itself, with automatic: true.
export async function markLetGo(id: string, userId: string, automatic: boolean, at: Date): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "desired_items"
      SET "let_go_automatically" = ${automatic}, "let_go_at" = ${at}
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
  } catch (error) {
    console.error("[considering] letGo meta not saved - migration 20260925100000 isn't applied yet:", error);
  }
}

// Quietly moves any "saved for later" item untouched for
// SAVED_RETENTION_DAYS to "let go" (decisionOutcome "dropped"), marked
// automatic. Checked fresh on every Considering tab load - the same
// no-background-job pattern src/lib/waitQueue.ts already uses for the wait
// timer, not a real cron job. Sets pause_status/decision_outcome directly
// via this same raw statement (rather than a separate typed Prisma call)
// so the whole transition is one atomic write. No-ops (never throws) until
// the migration above is applied, since there's no saved_at column yet to
// sweep by.
export async function sweepStaleSavedItems(userId: string, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - SAVED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    await prisma.$executeRaw`
      UPDATE "desired_items"
      SET
        "pause_status" = 'proceeded',
        "decision_outcome" = 'dropped',
        "let_go_automatically" = true,
        "let_go_at" = ${now}
      WHERE "user_id" = ${userId}::uuid
        AND "pause_status" = 'saved_for_later'
        AND COALESCE("saved_at", "created_at") <= ${cutoff}
    `;
  } catch (error) {
    console.error("[considering] auto-move sweep skipped - migration 20260925100000 isn't applied yet:", error);
  }
}

// Pauses end silently. Any item still "waiting" whose wait_until has passed is
// moved to "saved for later" the next time its owner loads the app - no
// notification, no prompt, nothing to decide. The 60-day clock starts at the
// moment the pause ended (saved_at = wait_until), not when this runs and not
// at any earlier save, so the existing auto-move to Let go applies from there.
// Reflection answers, price and everything else on the item are untouched.
//
// The move itself only uses columns that are already applied. The "Pause
// ended Oct 14" marker (pause_ended_at, prisma/manual/pause-ended-at.sql) is
// written in a second statement that degrades to a no-op until that column
// exists, so the move never waits on it.
export async function sweepEndedPauses(userId: string, now: Date = new Date()): Promise<string[]> {
  let movedIds: string[] = [];
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE "desired_items"
      SET
        "pause_status" = 'saved_for_later',
        "saved_at" = "wait_until",
        "let_go_automatically" = false,
        "let_go_at" = NULL
      WHERE "user_id" = ${userId}::uuid
        AND "pause_status" = 'waiting'
        AND "wait_until" IS NOT NULL
        AND "wait_until" <= ${now}
      RETURNING "id"
    `;
    movedIds = rows.map((row) => row.id);
  } catch (error) {
    console.error("[considering] ended pauses not moved - migration 20260925100000 isn't applied yet:", error);
    return [];
  }

  if (movedIds.length > 0) {
    try {
      await prisma.$executeRaw`
        UPDATE "desired_items" SET "pause_ended_at" = "wait_until"
        WHERE "user_id" = ${userId}::uuid AND "id" = ANY(${movedIds}::uuid[])
      `;
    } catch (error) {
      console.error("[considering] pause_ended_at not saved - prisma/manual/pause-ended-at.sql isn't applied yet:", error);
    }
  }
  return movedIds;
}

// When each item's pause ended, for the "Pause ended Oct 14" line. Empty until
// pause_ended_at exists; callers then fall back to the plain saved-days line.
export async function getPauseEndedAt(ids: string[]): Promise<Record<string, Date>> {
  if (ids.length === 0) return {};
  try {
    const rows = await prisma.$queryRaw<{ id: string; pause_ended_at: Date | null }[]>`
      SELECT "id", "pause_ended_at" FROM "desired_items"
      WHERE "id" = ANY(${ids}::uuid[]) AND "pause_ended_at" IS NOT NULL
    `;
    return Object.fromEntries(rows.map((row) => [row.id, row.pause_ended_at as Date]));
  } catch {
    return {};
  }
}

// A deliberate save (or a restore from Let go) is not an ended pause.
export async function clearPauseEnded(id: string, userId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "desired_items" SET "pause_ended_at" = NULL
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
  } catch {
    // Column not applied yet: nothing to clear.
  }
}
