-- PROPOSED - NOT YET APPLIED. Run by hand in Neon's SQL editor on BOTH the main
-- and test branches. Idempotent: safe to run more than once. One transaction,
-- so a failure leaves nothing half-built.
--
-- One savings goal per person: a name ("Lisbon trip") and a target amount.
-- "Saved toward it" is not stored: it is the total price of items let go since
-- the goal was created (computed in src/lib/goals/savingsGoal.ts), so it can
-- never drift from the Let go list. PAUSE counts money not spent; it does not
-- move money anywhere.
--
-- The app reads and writes this with raw SQL and shows no goal UI data until the
-- table exists, so nothing breaks before this runs. Do NOT add the model to
-- prisma/schema.prisma or run `prisma generate` until it exists on both branches.

BEGIN;

CREATE TABLE IF NOT EXISTS "savings_goals" (
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "savings_goals_target_positive" CHECK ("target_amount" > 0),
    CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMIT;
