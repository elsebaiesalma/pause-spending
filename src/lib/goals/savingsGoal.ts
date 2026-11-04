import { prisma } from "@/lib/prisma";

// One savings goal per person: a name and a target. "Saved toward it" is the
// total price of items let go since the goal was created, computed here from
// desired_items so it can never drift from the Let go list. PAUSE counts money
// not spent; it never moves money. Raw SQL, because the table is applied by
// hand (prisma/manual/savings-goal.sql): until it exists every function here
// degrades (null / no-op) instead of throwing.

export const GOAL_NAME_MAX = 40;
export const GOAL_AMOUNT_MAX = 100000;

export type SavingsGoal = {
  name: string;
  target: number;
  saved: number;
  // Items let go since the goal was set, so the card can say what was last added.
  lastAdded: { amount: number; itemName: string | null; at: Date } | null;
};

export type GoalProgress = {
  saved: number;
  remaining: number;
  // 0..1, for the bar width.
  fraction: number;
  reached: boolean;
};

export function goalProgress(target: number, saved: number): GoalProgress {
  const safeTarget = target > 0 ? target : 1;
  const clampedSaved = Math.max(0, saved);
  return {
    saved: clampedSaved,
    remaining: Math.max(0, safeTarget - clampedSaved),
    fraction: Math.min(1, clampedSaved / safeTarget),
    reached: clampedSaved >= safeTarget,
  };
}

export type GoalInput = { name: string; target: number };

// Form values come in as strings ("$800", "1,200.50"); anything that isn't a
// plain positive amount is rejected rather than guessed at.
export function parseGoalInput(rawName: unknown, rawAmount: unknown): GoalInput | null {
  if (typeof rawName !== "string" || typeof rawAmount !== "string") return null;
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > GOAL_NAME_MAX) return null;
  const cleaned = rawAmount.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const target = Number(cleaned);
  if (!(target > 0) || target > GOAL_AMOUNT_MAX) return null;
  return { name, target };
}

type GoalRow = {
  name: string;
  target_amount: string;
  saved: string | null;
  last_amount: string | null;
  last_name: string | null;
  last_at: Date | null;
};

// Whether the goals table exists. The goal UI is hidden entirely until it
// does, instead of offering a form that can only fail.
export async function isGoalStorageAvailable(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ present: boolean }[]>`
      SELECT to_regclass('public.savings_goals') IS NOT NULL AS present
    `;
    return rows[0]?.present === true;
  } catch (error) {
    console.error("[goals] could not check for the goals table:", error);
    return false;
  }
}

export async function getSavingsGoal(userId: string): Promise<SavingsGoal | null> {
  try {
    const rows = await prisma.$queryRaw<GoalRow[]>`
      SELECT
        g."name",
        g."target_amount"::text AS target_amount,
        (
          SELECT COALESCE(SUM(d."price"), 0)::text
          FROM "desired_items" d
          WHERE d."user_id" = g."user_id"
            AND d."decision_outcome" = 'dropped'
            AND d."user_confirmed" = true
            AND d."price" IS NOT NULL
            AND COALESCE(d."let_go_at", d."created_at") >= (g."created_at" AT TIME ZONE 'UTC')
        ) AS saved,
        l."price"::text AS last_amount,
        l."item_name" AS last_name,
        COALESCE(l."let_go_at", l."created_at") AS last_at
      FROM "savings_goals" g
      LEFT JOIN LATERAL (
        SELECT d."price", d."item_name", d."let_go_at", d."created_at"
        FROM "desired_items" d
        WHERE d."user_id" = g."user_id"
          AND d."decision_outcome" = 'dropped'
          AND d."user_confirmed" = true
          AND d."price" IS NOT NULL
          AND COALESCE(d."let_go_at", d."created_at") >= (g."created_at" AT TIME ZONE 'UTC')
        ORDER BY COALESCE(d."let_go_at", d."created_at") DESC
        LIMIT 1
      ) l ON true
      WHERE g."user_id" = ${userId}::uuid
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      name: row.name,
      target: Number(row.target_amount),
      saved: Number(row.saved ?? 0),
      lastAdded:
        row.last_amount !== null && row.last_at
          ? { amount: Number(row.last_amount), itemName: row.last_name, at: row.last_at }
          : null,
    };
  } catch (error) {
    console.error("[goals] goal not read - prisma/manual/savings-goal.sql isn't applied yet:", error);
    return null;
  }
}

// Changing the name or target keeps the goal's start date, so progress already
// made isn't wiped by a rename. `startAt` only applies when the goal is new:
// "count what I've already saved this month" starts it at the first of the
// month instead of now. Returns false when the table doesn't exist yet.
export async function saveSavingsGoal(userId: string, input: GoalInput, startAt?: Date): Promise<boolean> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "savings_goals" ("user_id", "name", "target_amount", "created_at")
      VALUES (${userId}::uuid, ${input.name}, ${input.target}, ${startAt ?? new Date()})
      ON CONFLICT ("user_id") DO UPDATE
      SET "name" = EXCLUDED."name", "target_amount" = EXCLUDED."target_amount", "updated_at" = now()
    `;
    return true;
  } catch (error) {
    console.error("[goals] goal not saved - prisma/manual/savings-goal.sql isn't applied yet:", error);
    return false;
  }
}

export async function removeSavingsGoal(userId: string): Promise<void> {
  try {
    await prisma.$executeRaw`DELETE FROM "savings_goals" WHERE "user_id" = ${userId}::uuid`;
  } catch (error) {
    console.error("[goals] goal not removed - prisma/manual/savings-goal.sql isn't applied yet:", error);
  }
}

// "Set the next goal" after one is reached: starts a fresh goal today, so the
// old savings don't instantly fill the new one.
export async function restartSavingsGoal(userId: string, input: GoalInput): Promise<boolean> {
  await removeSavingsGoal(userId);
  return saveSavingsGoal(userId, input);
}

// The first moment of a "YYYY-MM" month, in UTC (the same clock the goal's
// let-go comparison uses).
export function monthStart(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}
