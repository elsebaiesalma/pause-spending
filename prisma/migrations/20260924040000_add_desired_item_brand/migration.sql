-- AlterTable: purely additive, nullable, no data-loss risk. Backs the new
-- "Brand" field on the confirm step - free text, never validated against
-- the brand list (src/lib/brands/brandList.json), which only accelerates
-- search, never gates what can be typed.
ALTER TABLE "desired_items" ADD COLUMN "brand" TEXT;
