// Humanizes a wait's unlock time for the "on pause" cards - deliberately a
// fixed phrase computed once per render ("unlocks tomorrow, 9am"), never a
// ticking countdown, per the design's calm/no-urgency requirement.

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function calendarDaysBetween(a: Date, b: Date): number {
  const aMidnight = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMidnight = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((aMidnight - bMidnight) / 86_400_000);
}

function formatClockTime(date: Date): string {
  const minutes = date.getMinutes();
  let hours = date.getHours() % 12;
  if (hours === 0) hours = 12;
  const period = date.getHours() >= 12 ? "pm" : "am";
  return minutes === 0 ? `${hours}${period}` : `${hours}:${String(minutes).padStart(2, "0")}${period}`;
}

// The "when" part alone ("tomorrow, 9am"), for sentences that supply their
// own lead-in. The time is always the real wait_until, in the viewer's zone.
export function formatUnlockWhen(waitUntil: Date, now: Date = new Date()): string {
  const time = formatClockTime(waitUntil);

  if (isSameCalendarDay(waitUntil, now)) {
    return `today, ${time}`;
  }

  const daysAway = calendarDaysBetween(waitUntil, now);

  if (daysAway === 1) {
    return `tomorrow, ${time}`;
  }

  if (daysAway <= 6) {
    const weekday = waitUntil.toLocaleDateString(undefined, { weekday: "long" });
    return `${weekday}, ${time}`;
  }

  const date = waitUntil.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${date}, ${time}`;
}

export function formatUnlockTime(waitUntil: Date, now: Date = new Date()): string {
  if (waitUntil <= now) {
    return "ready for a decision";
  }
  return `unlocks ${formatUnlockWhen(waitUntil, now)}`;
}
