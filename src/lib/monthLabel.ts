// One readable format for a budget month everywhere it is shown: the month
// name alone ("October"), never the stored "2026-10" key. The key is always
// the current month, so the year adds nothing.

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatMonthLabel(monthKey: string): string {
  const month = Number(monthKey.split("-")[1]);
  return MONTH_NAMES[month - 1] ?? monthKey;
}
