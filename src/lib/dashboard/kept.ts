import { prisma } from "@/lib/prisma";
import { monthKeyForDate, monthKeyToRange } from "@/lib/budget";

export type KeptRange = "this_month" | "all_time";

export type KeptSummary = {
  totalKept: number;
  itemsLetGo: number;
};

// "Money kept" is the sum of confirmed prices across items the user chose
// to let go of (decisionOutcome "dropped") - never items they paused and
// then bought anyway (decisionOutcome "proceeded" is simply excluded by
// the where clause below), and never a price the user never confirmed.
// userConfirmed is checked alongside price - not-null, rather than trusting
// price alone, because the /confirm route is what makes a price "real"
// (it always resolves price to either a confirmed number or an explicit
// null); nothing downstream of that route can set decisionOutcome without
// having gone through it in the normal flow, but the API doesn't hard-
// enforce that ordering, so this keeps the guarantee true either way.
//
// "This month" is scoped by DesiredItem.createdAt (when the item was
// flagged for a pause), not a separate "decided at" timestamp - the model
// has no such field, and since every pause resolves within its wait
// window (24h-7d), createdAt is a close, honest proxy for "when this was
// let go."
export async function getKeptSummary(
  userId: string,
  range: KeptRange,
  now: Date = new Date()
): Promise<KeptSummary> {
  const createdAt = range === "this_month" ? monthKeyToRange(monthKeyForDate(now)) : undefined;

  const items = await prisma.desiredItem.findMany({
    where: {
      userId,
      decisionOutcome: "dropped",
      userConfirmed: true,
      price: { not: null },
      ...(createdAt ? { createdAt: { gte: createdAt.start, lt: createdAt.end } } : {}),
    },
    select: { price: true },
  });

  return {
    totalKept: items.reduce((sum, item) => sum + Number(item.price), 0),
    itemsLetGo: items.length,
  };
}
