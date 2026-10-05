import { prisma } from "@/lib/prisma";

export const STORE_VISIT_ANSWERS = ["bought", "not_bought", "not_sure"] as const;
export type StoreVisitAnswer = (typeof STORE_VISIT_ANSWERS)[number];

export function isStoreVisitAnswer(value: string | null | undefined): value is StoreVisitAnswer {
  return value !== null && value !== undefined && (STORE_VISIT_ANSWERS as readonly string[]).includes(value);
}

// "Yes" needs the price actually paid. Anything that isn't a positive finite
// number is refused rather than stored as a guess.
export function parseBoughtPrice(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const price = Number(raw);
  return Number.isFinite(price) && price > 0 ? price : null;
}

// Persists the "went to the store" and "Did you buy it?" state via raw SQL,
// against the columns in prisma/manual/still-want-it-store-visit.sql. Raw SQL
// keeps every other desired_items query unaffected until those columns are
// applied on both branches. Until then these functions degrade to no-ops, so
// the page still works and simply never shows the prompt.

export async function recordStoreVisit(id: string, userId: string, now: Date): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "desired_items"
      SET "went_to_store_at" = ${now}, "store_visit_answer" = NULL
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
  } catch (error) {
    console.error("[still-want-it] store visit not recorded - store-visit columns aren't applied yet:", error);
  }
}

export async function setStoreVisitAnswer(id: string, userId: string, answer: StoreVisitAnswer): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE "desired_items"
      SET "store_visit_answer" = ${answer}
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
  } catch (error) {
    console.error("[still-want-it] store visit answer not saved - store-visit columns aren't applied yet:", error);
  }
}

export type StoreVisitState = { wentToStoreAt: Date | null; answer: StoreVisitAnswer | null };

type StoreVisitRow = { went_to_store_at: Date | null; store_visit_answer: string | null };

// Returns null when there's no state to show, including while the columns
// don't exist yet.
export async function getStoreVisitState(id: string, userId: string): Promise<StoreVisitState | null> {
  try {
    const rows = await prisma.$queryRaw<StoreVisitRow[]>`
      SELECT "went_to_store_at", "store_visit_answer"
      FROM "desired_items"
      WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      wentToStoreAt: row.went_to_store_at,
      answer: isStoreVisitAnswer(row.store_visit_answer) ? row.store_visit_answer : null,
    };
  } catch (error) {
    console.error("[still-want-it] store visit state unavailable - store-visit columns aren't applied yet:", error);
    return null;
  }
}

// The prompt appears once per visit: after a "Go to" click, until the user
// answers, including "Not sure yet", which is an answer.
export function shouldAskDidYouBuy(state: StoreVisitState | null): boolean {
  return state !== null && state.wentToStoreAt !== null && state.answer === null;
}

export type UndecidedVisit = { id: string; wentToStoreAt: Date };

// Items the user visited the store for and answered "Not sure yet". They stay
// on the Considering tab under their own label. They are "proceeded" with
// decision_outcome "proceeded", so the Kept total (dropped only) and the
// 60-day sweep (saved_for_later only) never touch them. Clicking "Go to" again
// clears the answer, so the next visit asks again. Returns [] while the
// columns don't exist yet.
export async function listUndecidedVisits(userId: string): Promise<UndecidedVisit[]> {
  try {
    const rows = await prisma.$queryRaw<{ id: string; went_to_store_at: Date }[]>`
      SELECT "id", "went_to_store_at"
      FROM "desired_items"
      WHERE "user_id" = ${userId}::uuid
        AND "store_visit_answer" = 'not_sure'
        AND "pause_status" = 'proceeded'
        AND "decision_outcome" = 'proceeded'
      ORDER BY "went_to_store_at" DESC
    `;
    return rows.map((row) => ({ id: row.id, wentToStoreAt: row.went_to_store_at }));
  } catch (error) {
    console.error("[considering] undecided visits unavailable - store-visit columns aren't applied yet:", error);
    return [];
  }
}
