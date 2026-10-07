-- Adds the Still want it page's store-visit state to desired_items:
--   went_to_store_at     when the user last clicked "Go to [retailer]"
--   store_visit_answer   'bought' | 'not_bought' | 'not_sure', or NULL while
--                        the "Did you buy it?" prompt is still unanswered
--
-- Both columns were already created by hand on the main and test Neon
-- branches (prisma/manual/still-want-it-store-visit.sql), so these statements
-- are idempotent: recording this migration there changes nothing.

-- AlterTable
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "went_to_store_at" TIMESTAMP(3);
ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "store_visit_answer" TEXT;
