export type StripeSegment = { colorFamily: string; count: number };

// Real colorFamily counts, largest first. Items with no colorFamily are left
// out rather than guessed at; the caller hides the stripe if nothing is left.
export function colorStripeSegments(colorFamilies: (string | null)[]): StripeSegment[] {
  const counts = new Map<string, number>();
  for (const family of colorFamilies) {
    if (!family) continue;
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return Array.from(counts, ([colorFamily, count]) => ({ colorFamily, count })).sort(
    (a, b) => b.count - a.count || a.colorFamily.localeCompare(b.colorFamily)
  );
}
