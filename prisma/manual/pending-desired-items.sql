-- NOT A PRISMA MIGRATION. Run by hand in Neon's SQL editor, once per branch
-- (main and test). Idempotent: safe to run again, and safe on a branch where
-- some columns already exist.
--
-- Covers the two pending migrations:
--   20260925090000_add_desired_item_reflection       (6 columns + FK)
--   20260925100000_add_desired_item_considering_lifecycle (4 columns)
--
-- The purchases.price nullability change (20260924060000) is NOT in this
-- block: purchases.price was already nullable on both branches when checked
-- read-only on 2026-10-04, so there is nothing to change.
--
-- After running this on BOTH branches and running the verification query at
-- the bottom (all 10 rows should show present = true), record the three
-- migrations in _prisma_migrations, then run `npx prisma generate` once.

BEGIN;

-- Reflection (Pause screen)
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "reflection_replaces_wardrobe_item_id" UUID;
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "reflection_replaces_nothing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "reflection_need_score" INTEGER;
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "reflection_reason_for" TEXT;
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "reflection_reason_against" TEXT;
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "reflection_answered_at" TIMESTAMP(3);

-- Considering tab lifecycle
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3);
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "saved_at" TIMESTAMP(3);
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "let_go_automatically" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "let_go_at" TIMESTAMP(3);

-- Foreign key for reflection_replaces_wardrobe_item_id. ADD CONSTRAINT has no
-- IF NOT EXISTS form in Postgres, so check pg_constraint first.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'desired_items_reflection_replaces_wardrobe_item_id_fkey'
  ) THEN
    ALTER TABLE "desired_items"
      ADD CONSTRAINT "desired_items_reflection_replaces_wardrobe_item_id_fkey"
      FOREIGN KEY ("reflection_replaces_wardrobe_item_id")
      REFERENCES "wardrobe_items" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION: run on each branch. Expect 10 rows, every present = true.
-- ---------------------------------------------------------------------------
SELECT
  c.col_name,
  (i.column_name IS NOT NULL) AS present,
  i.data_type,
  i.is_nullable,
  i.column_default
FROM (VALUES
  ('reflection_replaces_wardrobe_item_id'),
  ('reflection_replaces_nothing'),
  ('reflection_need_score'),
  ('reflection_reason_for'),
  ('reflection_reason_against'),
  ('reflection_answered_at'),
  ('paused_at'),
  ('saved_at'),
  ('let_go_automatically'),
  ('let_go_at')
) AS c(col_name)
LEFT JOIN information_schema.columns i
  ON i.table_schema = 'public'
 AND i.table_name = 'desired_items'
 AND i.column_name = c.col_name
ORDER BY c.col_name;
