-- NOT A PRISMA MIGRATION, and NOT YET APPLIED. Run by hand in Neon's SQL
-- editor on BOTH main and the test branch. Idempotent: safe to run again.
--
-- Adds the state for the Still want it page:
--   went_to_store_at     when the user last clicked "Go to [retailer]"
--   store_visit_answer   their answer to "Did you buy it?" for that visit:
--                        'bought' | 'not_bought' | 'not_sure', or NULL while
--                        the prompt is still waiting for an answer
--
-- Both columns are nullable with no default, so existing rows are unaffected.
-- The app reads and writes them with raw SQL (src/lib/stillWantIt/storeVisit.ts),
-- so schema.prisma is intentionally NOT changed here. Until this runs, the
-- prompt simply never appears and "Go to" still opens the retailer.

BEGIN;

ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "went_to_store_at" TIMESTAMP(3);
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "store_visit_answer" TEXT;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION: run on each branch. Expect 2 rows, both present = true.
-- ---------------------------------------------------------------------------
SELECT
  c.col_name,
  (i.column_name IS NOT NULL) AS present,
  i.data_type,
  i.is_nullable,
  i.column_default
FROM (VALUES
  ('went_to_store_at'),
  ('store_visit_answer')
) AS c(col_name)
LEFT JOIN information_schema.columns i
  ON i.table_schema = 'public'
 AND i.table_name = 'desired_items'
 AND i.column_name = c.col_name
ORDER BY c.col_name;
