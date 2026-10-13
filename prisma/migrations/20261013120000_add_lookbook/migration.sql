-- Lookbook: saved outfit boards (looks) and the pieces on them. Applied by hand on
-- both Neon branches from prisma/manual/lookbook.sql (idempotent), then recorded
-- in _prisma_migrations with this file's checksum. Do not edit these bytes.

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
