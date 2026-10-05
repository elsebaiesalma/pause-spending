-- PROPOSED - NOT YET APPLIED. Do not run via scripts/apply-migration-via-http.mjs.
--
-- Adds the Pause screen's "a moment to think" reflection answers to
-- desired_items: what the item would replace, a 1-7 need score, and one
-- short reason for/against. Purely additive (new nullable columns plus one
-- boolean with a default), so no data-loss risk on existing rows.
--
-- To apply for real, from a machine with normal Postgres connectivity to
-- each Neon branch:
--   npx prisma migrate deploy
-- on BOTH the main and test databases, then once, on either:
--   npx prisma generate
-- (generate only reads schema.prisma - it doesn't touch a database - so it
-- only needs to run once, but not until this migration is deployed to BOTH
-- branches, since the generated client would otherwise select columns that
-- don't exist yet on whichever branch you haven't migrated).
--
-- src/lib/pauseScreen/reflection.ts saves/reads these columns via raw SQL
-- rather than the generated Prisma Client, specifically so the rest of the
-- app (every other query against desired_items) is completely unaffected
-- by this migration being pending - nothing else needs to wait on it.

-- AlterTable
ALTER TABLE "desired_items" ADD COLUMN "reflection_replaces_wardrobe_item_id" UUID;
ALTER TABLE "desired_items" ADD COLUMN "reflection_replaces_nothing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "desired_items" ADD COLUMN "reflection_need_score" INTEGER;
ALTER TABLE "desired_items" ADD COLUMN "reflection_reason_for" TEXT;
ALTER TABLE "desired_items" ADD COLUMN "reflection_reason_against" TEXT;
ALTER TABLE "desired_items" ADD COLUMN "reflection_answered_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "desired_items" ADD CONSTRAINT "desired_items_reflection_replaces_wardrobe_item_id_fkey"
  FOREIGN KEY ("reflection_replaces_wardrobe_item_id") REFERENCES "wardrobe_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
