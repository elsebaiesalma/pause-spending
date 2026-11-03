// "Paused 24 hours" / "Paused 7 days" for the Bought tab, from the lifecycle
// timestamps. Anything that isn't clearly one of the two pause lengths gets no
// label rather than an odd number.
const HOUR_MS = 60 * 60 * 1000;

export function pauseLengthLabel(pausedAt: Date | null, waitUntil: Date | null): string | null {
  if (!pausedAt || !waitUntil) return null;
  const hours = (waitUntil.getTime() - pausedAt.getTime()) / HOUR_MS;
  if (hours > 0 && hours <= 36) return "Paused 24 hours";
  if (hours >= 5 * 24 && hours <= 9 * 24) return "Paused 7 days";
  return null;
}
