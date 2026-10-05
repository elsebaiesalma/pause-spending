import { prisma } from "@/lib/prisma";
import type { Budget } from "@prisma/client";

export function monthKeyForDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function currentMonthKey(): string {
  return monthKeyForDate(new Date());
}

export function monthKeyToRange(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

// Sums this month's spend, scoped to `active` purchases only - a
// needs_review draft's price is a placeholder, not real confirmed spend.
export async function getMonthSpend(userId: string, monthKey: string): Promise<number> {
  const { start, end } = monthKeyToRange(monthKey);

  const purchases = await prisma.purchase.findMany({
    where: { userId, status: "active", orderDate: { gte: start, lt: end } },
    select: { price: true },
  });

  return purchases.reduce((sum, purchase) => sum + Number(purchase.price), 0);
}

// A starting-figure suggestion for a new budget, computed as the average
// monthly spend across past months with any recorded active purchases
// (excluding the month being budgeted for). Returns null when there's no
// history yet to base a suggestion on - the UI must show a "set your
// first budget" prompt in that case, never a misleading number. This is a
// deterministic computation, not an LLM call - the design's requirement is
// only that the app can suggest a number, never that it auto-applies one.
export async function computeSuggestedBudget(
  userId: string,
  excludeMonthKey: string
): Promise<number | null> {
  const purchases = await prisma.purchase.findMany({
    where: { userId, status: "active" },
    select: { price: true, orderDate: true },
  });

  const totalsByMonth = new Map<string, number>();
  for (const purchase of purchases) {
    const key = monthKeyForDate(purchase.orderDate);
    if (key === excludeMonthKey) continue;
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + Number(purchase.price));
  }

  if (totalsByMonth.size === 0) {
    return null;
  }

  const total = Array.from(totalsByMonth.values()).reduce((a, b) => a + b, 0);
  return Math.round((total / totalsByMonth.size) * 100) / 100;
}

export async function getBudgetForMonth(userId: string, monthKey: string): Promise<Budget | null> {
  return prisma.budget.findUnique({ where: { userId_month: { userId, month: monthKey } } });
}

// The user's own explicit action - never called automatically from a
// suggested figure.
export async function setBudgetForMonth(
  userId: string,
  monthKey: string,
  amount: number
): Promise<Budget> {
  return prisma.budget.upsert({
    where: { userId_month: { userId, month: monthKey } },
    create: {
      userId,
      month: monthKey,
      amount: amount.toString(),
      categoryScope: "clothing_shoes_accessories",
    },
    update: { amount: amount.toString() },
  });
}
