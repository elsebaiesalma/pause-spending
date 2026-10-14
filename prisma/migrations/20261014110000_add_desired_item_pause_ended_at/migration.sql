-- Marker for the Considering line "Pause ended Oct 14": the moment a pause ended
-- and the item moved, silently, to Undecided. Applied by hand on both Neon
-- branches from prisma/manual/pause-ended-at.sql (idempotent), then recorded in
-- _prisma_migrations with this file's checksum. Do not edit these bytes.

ALTER TABLE "desired_items" ADD COLUMN IF NOT EXISTS "pause_ended_at" TIMESTAMP(3);
