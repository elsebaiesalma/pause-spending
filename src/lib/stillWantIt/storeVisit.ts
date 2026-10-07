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

// Persists the "went to the store" and "Did you buy it?" state. Every query
// is scoped by userId, so an id belonging to another user matches nothing.

export async function recordStoreVisit(id: string, userId: string, now: Date): Promise<void> {
  await prisma.desiredItem.updateMany({
    where: { id, userId },
    data: { wentToStoreAt: now, storeVisitAnswer: null },
  });
}

export async function setStoreVisitAnswer(id: string, userId: string, answer: StoreVisitAnswer): Promise<void> {
  await prisma.desiredItem.updateMany({
    where: { id, userId },
    data: { storeVisitAnswer: answer },
  });
}

export type StoreVisitState = { wentToStoreAt: Date | null; answer: StoreVisitAnswer | null };

// Returns null when the item doesn't exist or isn't this user's.
export async function getStoreVisitState(id: string, userId: string): Promise<StoreVisitState | null> {
  const row = await prisma.desiredItem.findFirst({
    where: { id, userId },
    select: { wentToStoreAt: true, storeVisitAnswer: true },
  });
  if (!row) return null;
  return {
    wentToStoreAt: row.wentToStoreAt,
    answer: isStoreVisitAnswer(row.storeVisitAnswer) ? row.storeVisitAnswer : null,
  };
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
// clears the answer, so the next visit asks again.
export async function listUndecidedVisits(userId: string): Promise<UndecidedVisit[]> {
  const rows = await prisma.desiredItem.findMany({
    where: {
      userId,
      storeVisitAnswer: "not_sure",
      pauseStatus: "proceeded",
      decisionOutcome: "proceeded",
      wentToStoreAt: { not: null },
    },
    select: { id: true, wentToStoreAt: true },
    orderBy: { wentToStoreAt: "desc" },
  });
  return rows.flatMap((row) => (row.wentToStoreAt ? [{ id: row.id, wentToStoreAt: row.wentToStoreAt }] : []));
}
