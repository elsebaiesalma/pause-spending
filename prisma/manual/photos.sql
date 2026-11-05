-- PROPOSED - NOT YET APPLIED. Run by hand in Neon's SQL editor on BOTH the main
-- and test branches. Idempotent: safe to run more than once. One transaction.
--
-- Uploaded item photos, kept in the database (no file storage service yet). The
-- app shrinks every photo to a small JPEG (about 1000 px tall, usually 100 to
-- 250 KB) before it is stored, and serves it from /api/photos/<id>, only to the
-- person who uploaded it. Items keep that path in their existing image_url.
--
-- The app checks for this table and hides every photo upload control until it
-- exists, so nothing breaks before this runs. Do NOT add the model to
-- prisma/schema.prisma or run `prisma generate` until it exists on both branches.

BEGIN;

CREATE TABLE IF NOT EXISTS "photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "content_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "photos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "photos_user_id_idx" ON "photos"("user_id");

COMMIT;
