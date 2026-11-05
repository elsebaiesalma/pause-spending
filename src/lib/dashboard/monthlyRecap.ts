import { prisma } from "@/lib/prisma";
import { monthKeyForDate, monthKeyToRange } from "@/lib/budget";
import { formatMonthLabel } from "@/lib/monthLabel";
import { categoryConfig, categoryKeyOf } from "@/lib/wardrobeView";

// The monthly recap: a quiet card on Home, shown only in the first week of a
// month and only if last month had something in it. No email, no push - people
// see it when they come back. Months are UTC, like every other budget month in
// the app (monthKeyForDate), and "last month" is a month key like "2026-10".

export const RECAP_WINDOW_DAYS = 7;

export type RecapItem = {
  createdAt: Date;
  userConfirmed: boolean;
  pauseStatus: string;
  decisionOutcome: string | null;
  price: number | null;
  category: string | null;
};

export type MonthStats = {
  // Items confirmed that month (the "was there anything to recap" test).
  confirmed: number;
  // Confirmed items that went to a pause screen (not stuck on the confirm step).
  paused: number;
  letGo: number;
  // Money not spent: the priced let-go items, the same rule as the Let go total.
  saved: number;
  mostResisted: { label: string; count: number } | null;
};

export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

function inMonth(date: Date, monthKey: string): boolean {
  const { start, end } = monthKeyToRange(monthKey);
  return date >= start && date < end;
}

export function monthStats(items: RecapItem[], monthKey: string): MonthStats {
  const monthItems = items.filter((item) => item.userConfirmed && inMonth(item.createdAt, monthKey));
  const letGoItems = monthItems.filter((item) => item.decisionOutcome === "dropped");

  const byCategory = new Map<string, { label: string; count: number; value: number }>();
  for (const item of letGoItems) {
    const config = categoryConfig(categoryKeyOf(item.category));
    const entry = byCategory.get(config.key) ?? { label: config.label, count: 0, value: 0 };
    entry.count += 1;
    entry.value += item.price ?? 0;
    byCategory.set(config.key, entry);
  }
  // Most let-go items wins; a tie goes to the bigger amount, then the label, so
  // the answer never depends on the order rows came back in.
  const ranked = [...byCategory.values()].sort(
    (a, b) => b.count - a.count || b.value - a.value || a.label.localeCompare(b.label)
  );

  return {
    confirmed: monthItems.length,
    paused: monthItems.filter((item) => item.pauseStatus !== "pending_confirmation").length,
    letGo: letGoItems.length,
    saved: letGoItems.reduce((sum, item) => sum + (item.price ?? 0), 0),
    mostResisted: ranked[0] ? { label: ranked[0].label, count: ranked[0].count } : null,
  };
}

// Neutral wording on purpose: a difference, never a win or a loss. Only when
// the month before also had something in it.
export function pausedComparison(current: MonthStats, previous: MonthStats, previousLabel: string): string | null {
  if (previous.confirmed < 1) return null;
  const difference = current.paused - previous.paused;
  if (difference === 0) return `Same as ${previousLabel}`;
  return `${Math.abs(difference)} ${difference > 0 ? "more" : "fewer"} than ${previousLabel}`;
}

export function shouldShowRecap(now: Date, lastMonth: MonthStats, allMonth = false): boolean {
  return (allMonth || now.getUTCDate() <= RECAP_WINDOW_DAYS) && lastMonth.confirmed >= 1;
}

export type MonthlyRecapData = {
  // The recapped (previous) month, e.g. "2026-10"; the dismissal is remembered per month.
  monthKey: string;
  monthLabel: string;
  stats: MonthStats;
  comparison: string | null;
};

// allMonth: demo accounts see the recap all month, so every visitor sees it.
export async function loadMonthlyRecap(
  userId: string,
  now: Date = new Date(),
  { allMonth = false }: { allMonth?: boolean } = {}
): Promise<MonthlyRecapData | null> {
  // The early return keeps the query off every Home load after the first week.
  if (!allMonth && now.getUTCDate() > RECAP_WINDOW_DAYS) return null;

  const recapKey = previousMonthKey(monthKeyForDate(now));
  const beforeKey = previousMonthKey(recapKey);

  const rows = await prisma.desiredItem.findMany({
    where: {
      userId,
      userConfirmed: true,
      createdAt: { gte: monthKeyToRange(beforeKey).start, lt: monthKeyToRange(recapKey).end },
    },
    select: { createdAt: true, userConfirmed: true, pauseStatus: true, decisionOutcome: true, price: true, category: true },
  });
  const items: RecapItem[] = rows.map((row) => ({ ...row, price: row.price === null ? null : Number(row.price) }));

  const stats = monthStats(items, recapKey);
  if (!shouldShowRecap(now, stats, allMonth)) return null;

  return {
    monthKey: recapKey,
    monthLabel: formatMonthLabel(recapKey),
    stats,
    comparison: pausedComparison(stats, monthStats(items, beforeKey), formatMonthLabel(beforeKey)),
  };
}
