-- AlterTable: purchases had no color field before - purely additive.
ALTER TABLE "purchases" ADD COLUMN "color_name" TEXT;
ALTER TABLE "purchases" ADD COLUMN "color_family" TEXT;

-- AlterTable: true column rename (preserves all 72 existing wardrobe_items
-- values) - do NOT let this become DROP COLUMN "primary_color" + ADD COLUMN
-- "color_name", which would silently destroy every existing color value.
-- secondary_color is intentionally left in place here: it is still read by
-- scripts/backfillColorFamily.ts to derive colorFamily = 'multi' for
-- two-tone items. It is dropped by a later, separate migration only once
-- that backfill's verification step confirms every row has been migrated.
ALTER TABLE "wardrobe_items" RENAME COLUMN "primary_color" TO "color_name";
ALTER TABLE "wardrobe_items" ADD COLUMN "color_family" TEXT;

-- AlterTable: true column rename (preserves the existing desired_items value).
ALTER TABLE "desired_items" RENAME COLUMN "primary_color" TO "color_name";
ALTER TABLE "desired_items" ADD COLUMN "color_family" TEXT;
