import { monthKeyForDate, monthKeyToRange } from "@/lib/budget";
import { formatMonthLabel } from "@/lib/monthLabel";

// Decisions can be narrowed to one month. A month is when the item was added
// (the same basis as Home's monthly recap, so "See November's decisions" shows
// the items the recap counted). Keys are UTC, like every other month key.
export function parseMonthParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : null;
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
