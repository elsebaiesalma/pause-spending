import { monthKeyForDate, monthKeyToRange } from "@/lib/budget";
import { formatMonthLabel } from "@/lib/monthLabel";
import { localDate } from "@/lib/dashboard/monthlyRecap";

// Decisions can be narrowed to one month. A month is when the item was added
// (the same basis as Home's monthly recap, so "See November's decisions" shows
// the items the recap counted). Keys are UTC, like every other month key.
export const ALL_TIME = "all";

// What the URL asked for: a month key, "all", or nothing valid (null).
export function parseMonthParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === ALL_TIME) return ALL_TIME;
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : null;
}

// The month to show. With no valid month in the URL it is the current month on
// the person's own clock, so Decisions opens on "this month". "all" shows
// everything and comes back as null.
export function resolveMonth(param: string | null, timeZone?: string | null, now: Date = new Date()): string | null {
  if (param === ALL_TIME) return null;
  return param ?? monthKeyForDate(localDate(now, timeZone));
}

export function inMonth(date: Date, monthKey: string | null): boolean {
  if (!monthKey) return true;
  const { start, end } = monthKeyToRange(monthKey);
  return date >= start && date < end;
}

// Newest first, only months that have something in them. The selected month is
// kept even when empty, so the picker never shows a value it cannot list.
export function monthOptions(dates: Date[], selected: string | null): { key: string; label: string }[] {
  const keys = new Set(dates.map(monthKeyForDate));
  if (selected) keys.add(selected);
  const year = (key: string) => key.split("-")[0];
  const currentYear = year(monthKeyForDate(new Date()));
  return [...keys]
    .sort()
    .reverse()
    .map((key) => ({
      key,
      label: year(key) === currentYear ? formatMonthLabel(key) : `${formatMonthLabel(key)} ${year(key)}`,
    }));
}
