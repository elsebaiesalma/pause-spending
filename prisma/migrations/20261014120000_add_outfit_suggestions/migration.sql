-- Durable outfit cache table (outfit_suggestions). Applied by hand on both Neon
-- branches from prisma/manual/outfit-suggestions.sql (idempotent), then recorded
-- in _prisma_migrations with this file's checksum. Do not edit these bytes.

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
