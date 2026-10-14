-- PROPOSED - NOT YET APPLIED. Run by hand in Neon's SQL editor on BOTH the main
-- and test branches. Idempotent: safe to run more than once. One transaction,
-- so a failure leaves nothing half-built.
--
-- Durable outfit cache: validated outfit suggestions (ids only), so they
-- survive restarts and are shared across server processes.
--
--   user_id            whose wardrobe the ids come from (always the session user)
--   desired_item_id    the wanted item the outfits approximate, or NULL for the
--                      Lookbook's "New look" suggestion, which has no wanted item
--   wardrobe_version   hash of the wardrobe at generation time; a changed
--                      wardrobe is a natural miss
--   outfits            JSON array like [{"itemIds": ["<uuid>", ...]}, ...]
--
-- Deleting the user or the wanted item deletes its cache rows; they are
-- derivable, so nothing is lost. A plain unique index cannot treat NULL
-- desired_item_id rows as equal, so uniqueness is two partial indexes.
--
-- The app reads and writes this with raw SQL (src/lib/stillWantIt/outfitCacheStore.ts)
-- and keeps using its in-memory cache until the table exists, so nothing breaks
-- before this runs. Do NOT add the model to prisma/schema.prisma or run
-- `prisma generate` until it exists on both branches.

BEGIN;

CREATE TABLE IF NOT EXISTS "outfit_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "desired_item_id" UUID,
    "wardrobe_version" TEXT NOT NULL,
    "outfits" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "outfit_suggestions_item_key"
  ON "outfit_suggestions"("user_id", "desired_item_id", "wardrobe_version")
  WHERE "desired_item_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "outfit_suggestions_open_key"
  ON "outfit_suggestions"("user_id", "wardrobe_version")
  WHERE "desired_item_id" IS NULL;
CREATE INDEX IF NOT EXISTS "outfit_suggestions_desired_item_id_idx" ON "outfit_suggestions"("desired_item_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outfit_suggestions_user_id_fkey') THEN
    ALTER TABLE "outfit_suggestions" ADD CONSTRAINT "outfit_suggestions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outfit_suggestions_desired_item_id_fkey') THEN
    ALTER TABLE "outfit_suggestions" ADD CONSTRAINT "outfit_suggestions_desired_item_id_fkey"
      FOREIGN KEY ("desired_item_id") REFERENCES "desired_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- Verify. Expect exactly 7 rows: 1 table, 3 constraints, 3 indexes.
SELECT 'table' AS kind, table_name::text AS name, '' AS detail
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'outfit_suggestions'
UNION ALL
SELECT 'constraint', conname::text, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname IN ('outfit_suggestions_pkey', 'outfit_suggestions_user_id_fkey', 'outfit_suggestions_desired_item_id_fkey')
UNION ALL
SELECT 'index', indexname::text, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexname IN (
  'outfit_suggestions_item_key', 'outfit_suggestions_open_key', 'outfit_suggestions_desired_item_id_idx'
)
ORDER BY 1, 2;
