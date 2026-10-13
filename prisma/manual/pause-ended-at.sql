-- PROPOSED - NOT YET APPLIED. Run by hand in Neon's SQL editor on BOTH the
-- main and test branches. Idempotent: safe to run more than once.
--
-- Adds the marker behind the Considering line "Pause ended Oct 14": the
-- moment a pause ended and the item moved, silently, to Saved for later.
-- Purely additive (one nullable column), no data at risk.
--
-- Do NOT add this column to prisma/schema.prisma or run `prisma generate`
-- until it exists on both branches; the app reads and writes it with raw SQL
-- (src/lib/considering/consideringMeta.ts) and works without it, minus the
-- "Pause ended" wording.

ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "pause_ended_at" TIMESTAMP(3);

-- Verify (expect one row: pause_ended_at | timestamp without time zone | YES):
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'desired_items' AND column_name = 'pause_ended_at';
