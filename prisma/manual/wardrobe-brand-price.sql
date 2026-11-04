-- PROPOSED - NOT YET APPLIED. Run by hand in Neon's SQL editor on BOTH the main
-- and test branches. Idempotent: safe to run more than once. One transaction.
--
-- Adds an optional brand and price to closet pieces added by hand. Pieces made
-- from a receipt keep showing their purchase's merchant and price; these two
-- columns only matter when there is no purchase.
--
-- Do NOT add the fields to prisma/schema.prisma or run `prisma generate` until
-- this has run on both branches and been confirmed.

BEGIN;

ALTER TABLE "wardrobe_items" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "wardrobe_items" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2);

-- Record it as a migration (checksum is the SHA-256 of
-- prisma/migrations/20261104170000_add_wardrobe_item_brand_price/migration.sql).
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
SELECT gen_random_uuid()::text, '3f6f1603953b8974d5cf1a63b159bddf3e4354047fe35c0cf5bf40d7dc1478af', now(), '20261104170000_add_wardrobe_item_brand_price', 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20261104170000_add_wardrobe_item_brand_price');

COMMIT;

-- Verify. Expect 2 column rows and 1 migration row.
SELECT 'column' AS kind, column_name::text AS name, data_type::text AS detail
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'wardrobe_items' AND column_name IN ('brand', 'price')
UNION ALL
SELECT 'migration', migration_name::text, checksum::text
FROM "_prisma_migrations" WHERE migration_name = '20261104170000_add_wardrobe_item_brand_price'
ORDER BY 1, 2;
