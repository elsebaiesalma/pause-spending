-- PROPOSED - NOT YET APPLIED. Run by hand in Neon's SQL editor on BOTH the main
-- and test branches. Idempotent: safe to run more than once. Wrapped in one
-- transaction, so a failure leaves nothing half-built.
--
-- The Lookbook: saved outfit boards.
--
--   looks       one board per row. `name` is always set (the app writes
--               "Look 01", "Look 02"... when the person gives none).
--               `inspired_by_desired_item_id` links a look built at a moment of
--               temptation to the wanted item; deleting that item keeps the look.
--   look_items  the pieces on a board and where they sit. Coordinates are
--               fractions of the board so a look renders the same at any size:
--                 x, y   top-left corner of the piece, 0 to 1 of board width / height
--                 scale  piece width as a fraction of board width
--               The board is portrait, 4:5. z_order: higher draws on top.
--
-- Same-user integrity is enforced by the database, not only by the app:
-- look_items carries user_id, and two composite foreign keys tie it to BOTH
-- the look and the wardrobe item, so a row can only exist if the look and the
-- piece belong to the same user. That needs a unique (id, user_id) on looks and
-- on wardrobe_items (additive; ids are already unique). The inspired-by link
-- is checked in the app, scoped by the session user.
--
-- Do NOT add these models to prisma/schema.prisma or run `prisma generate`
-- until this has run on both branches.

BEGIN;

-- Needed as the target of the composite foreign keys below.
CREATE UNIQUE INDEX IF NOT EXISTS "wardrobe_items_id_user_id_key" ON "wardrobe_items"("id", "user_id");

CREATE TABLE IF NOT EXISTS "looks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "inspired_by_desired_item_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "looks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "look_items" (
    "id" UUID NOT NULL,
    "look_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wardrobe_item_id" UUID NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL,
    "z_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "look_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "looks_id_user_id_key" ON "looks"("id", "user_id");
CREATE INDEX IF NOT EXISTS "looks_user_id_created_at_idx" ON "looks"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "looks_inspired_by_desired_item_id_idx" ON "looks"("inspired_by_desired_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "look_items_look_id_wardrobe_item_id_key" ON "look_items"("look_id", "wardrobe_item_id");
CREATE INDEX IF NOT EXISTS "look_items_look_id_idx" ON "look_items"("look_id");
CREATE INDEX IF NOT EXISTS "look_items_wardrobe_item_id_idx" ON "look_items"("wardrobe_item_id");

-- Foreign keys and the check, each added only if it is not there yet.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'looks_user_id_fkey') THEN
    ALTER TABLE "looks" ADD CONSTRAINT "looks_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'looks_inspired_by_desired_item_id_fkey') THEN
    ALTER TABLE "looks" ADD CONSTRAINT "looks_inspired_by_desired_item_id_fkey"
      FOREIGN KEY ("inspired_by_desired_item_id") REFERENCES "desired_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- A piece on a board must belong to the same user as the board.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'look_items_look_id_user_id_fkey') THEN
    ALTER TABLE "look_items" ADD CONSTRAINT "look_items_look_id_user_id_fkey"
      FOREIGN KEY ("look_id", "user_id") REFERENCES "looks"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'look_items_wardrobe_item_id_user_id_fkey') THEN
    ALTER TABLE "look_items" ADD CONSTRAINT "look_items_wardrobe_item_id_user_id_fkey"
      FOREIGN KEY ("wardrobe_item_id", "user_id") REFERENCES "wardrobe_items"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'look_items_scale_check') THEN
    ALTER TABLE "look_items" ADD CONSTRAINT "look_items_scale_check" CHECK ("scale" > 0 AND "scale" <= 2);
  END IF;
END $$;

COMMIT;

-- Verify. Expect exactly 16 rows: 2 tables, 7 constraints, 7 indexes.
SELECT 'table' AS kind, table_name::text AS name, '' AS detail
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('looks', 'look_items')
UNION ALL
SELECT 'constraint', conname::text, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname IN (
  'looks_pkey', 'look_items_pkey', 'looks_user_id_fkey', 'looks_inspired_by_desired_item_id_fkey',
  'look_items_look_id_user_id_fkey', 'look_items_wardrobe_item_id_user_id_fkey', 'look_items_scale_check'
)
UNION ALL
SELECT 'index', indexname::text, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexname IN (
  'wardrobe_items_id_user_id_key', 'looks_id_user_id_key', 'looks_user_id_created_at_idx',
  'looks_inspired_by_desired_item_id_idx', 'look_items_look_id_wardrobe_item_id_key',
  'look_items_look_id_idx', 'look_items_wardrobe_item_id_idx'
)
ORDER BY 1, 2;
