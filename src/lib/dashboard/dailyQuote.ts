import quotes from "@/data/quotes.json";

export type Quote = { text: string; source: string };

const MS_PER_DAY = 86_400_000;

// One quote per UTC day, so every load that day (and every viewer) sees the
// same line. Walks the pool in order rather than hashing, so a four-quote
// pool shows each one equally often.
export function quoteForDay(now: Date = new Date(), pool: Quote[] = quotes): Quote {
  const dayNumber = Math.floor(now.getTime() / MS_PER_DAY);
  return pool[dayNumber % pool.length];
}
