import { prisma } from "@/lib/prisma";

// "What works for you": how often someone let a thing go after a 24-hour pause
// versus a 7-day pause. Counts, never percentages - a handful of pauses is too
// few for a percentage to mean anything. Only finished pauses count: the item
// has a pause start and end and a final decision (let go, or bought).

export const PATTERN_MIN_DECIDED = 5;
// A "24-hour" pause is anything up to 36h (the buttons give 24h; this absorbs
// clock drift), a "7-day" pause is 5 days or more. Anything between is ignored.
const SHORT_MAX_HOURS = 36;
const LONG_MIN_DAYS = 5;

export type FinishedPause = {
  pausedAt: Date;
  waitUntil: Date;
  outcome: "dropped" | "proceeded";
};

export type PauseBucket = { total: number; letGo: number };

export type PausePatternData = {
  // Pauses counted across both buckets.
  decided: number;
  short: PauseBucket;
  long: PauseBucket;
  // Enough pauses to show the pattern; otherwise the card shows progress.
  ready: boolean;
  headline: string;
  // Only when 7-day is clearly better; otherwise just the basis line.
  footnote: string;
};

export function bucketPauses(pauses: FinishedPause[]): { short: PauseBucket; long: PauseBucket } {
  const short: PauseBucket = { total: 0, letGo: 0 };
  const long: PauseBucket = { total: 0, letGo: 0 };
  for (const pause of pauses) {
    const hours = (pause.waitUntil.getTime() - pause.pausedAt.getTime()) / 3_600_000;
    const bucket = hours <= SHORT_MAX_HOURS ? short : hours >= LONG_MIN_DAYS * 24 ? long : null;
    if (!bucket) continue;
    bucket.total += 1;
    if (pause.outcome === "dropped") bucket.letGo += 1;
  }
  return { short, long };
}

// Compares let-go rates without showing them. Cross-multiplied so there is no
// rounding: a/b > c/d  <=>  a*d > c*b.
function compareRates(a: PauseBucket, b: PauseBucket): number {
  return a.letGo * b.total - b.letGo * a.total;
}

export function describePattern(short: PauseBucket, long: PauseBucket): { headline: string; longerWins: boolean } {
  if (short.total >= 2 && long.total >= 2) {
    const difference = compareRates(long, short);
    if (difference > 0) return { headline: "Longer pauses work better for you", longerWins: true };
    if (difference < 0) return { headline: "Shorter pauses work well for you", longerWins: false };
    return { headline: "Both pause lengths work about the same for you", longerWins: false };
  }
  return { headline: "How your pauses ended", longerWins: false };
}

export function buildPausePattern(pauses: FinishedPause[]): PausePatternData {
  const { short, long } = bucketPauses(pauses);
  const decided = short.total + long.total;
  const { headline, longerWins } = describePattern(short, long);
  const basis = `Based on your ${decided} finished pauses.`;
  return {
    decided,
    short,
    long,
    ready: decided >= PATTERN_MIN_DECIDED,
    headline,
    footnote: longerWins ? `${basis} Try 7 days for the things you want most.` : basis,
  };
}

type Row = { paused_at: Date; wait_until: Date; decision_outcome: string };

// Hidden (null) when the pause columns can't be read, e.g. the migration that
// adds paused_at isn't applied on this database yet.
export async function loadPausePattern(userId: string): Promise<PausePatternData | null> {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT "paused_at", "wait_until", "decision_outcome"
      FROM "desired_items"
      WHERE "user_id" = ${userId}::uuid
        AND "paused_at" IS NOT NULL
        AND "wait_until" IS NOT NULL
        AND "decision_outcome" IN ('dropped', 'proceeded')
    `;
    return buildPausePattern(
      rows.map((row) => ({
        pausedAt: row.paused_at,
        waitUntil: row.wait_until,
        outcome: row.decision_outcome as FinishedPause["outcome"],
      }))
    );
  } catch (error) {
    console.error("[pattern] pause pattern not read - migration 20260925100000 isn't applied yet:", error);
    return null;
  }
}
