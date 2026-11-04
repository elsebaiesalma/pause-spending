-- Brand and price for closet pieces added by hand (pieces made from a receipt
-- keep using their purchase's merchant and price). Applied by hand on both Neon
-- branches from prisma/manual/wardrobe-brand-price.sql (idempotent), then
-- recorded in _prisma_migrations with this file's checksum. Do not edit these bytes.

ALTER TABLE "wardrobe_items" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "wardrobe_items" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2);
