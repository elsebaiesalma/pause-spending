-- PROPOSED - NOT YET APPLIED. Do not run via scripts/apply-migration-via-http.mjs.
--
-- Adds the Considering tab's lifecycle timestamps to desired_items: when the
-- current pause started, when the item most recently entered "saved for
-- later", and when/how it most recently became "dropped" (let go). Purely
-- additive (new nullable columns plus one boolean with a default), so no
-- data-loss risk on existing rows.
--
-- This is a SEPARATE migration from
-- prisma/migrations/20260925090000_add_desired_item_reflection, which the
-- Considering tab also depends on (it displays saved reflection answers on
-- each "on pause" row) - apply both together.
--
-- To apply for real, from a machine with normal Postgres connectivity to
-- each Neon branch:
--   npx prisma migrate deploy
-- on BOTH the main and test databases, then once, on either:
--   npx prisma generate
-- (only needs to run once, but not until BOTH this migration and the
-- reflection one above are deployed to BOTH branches, since the generated
-- client would otherwise select columns that don't exist yet on whichever
-- branch/migration you haven't finished).
--
-- src/lib/considering/consideringMeta.ts saves/reads these columns via raw
-- SQL rather than the generated Prisma Client, for the same reason as the
-- reflection migration: every other desired_items query in the app stays
-- completely unaffected by this being pending.

-- AlterTable
ALTER TABLE "desired_items" ADD COLUMN "paused_at" TIMESTAMP(3);
ALTER TABLE "desired_items" ADD COLUMN "saved_at" TIMESTAMP(3);
ALTER TABLE "desired_items" ADD COLUMN "let_go_automatically" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "desired_items" ADD COLUMN "let_go_at" TIMESTAMP(3);
