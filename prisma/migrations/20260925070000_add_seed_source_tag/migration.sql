-- AlterTable: purely additive, nullable, no data-loss risk. Backs a tag
-- for mock/seed rows (e.g. scripts/seedMockWardrobe.ts) so they can be
-- identified and deleted without touching real data. Null on every
-- existing row.
ALTER TABLE "purchases" ADD COLUMN "source" TEXT;
ALTER TABLE "wardrobe_items" ADD COLUMN "source" TEXT;
