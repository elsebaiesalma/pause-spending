-- AlterTable: purely additive, nullable, no data-loss risk. Backs the
-- explicit "this itemName is a low-confidence guess" signal the confirm
-- page uses for the URL-paste slug-fallback and low-confidence search
-- candidates, rather than an implicit heuristic based on which other
-- fields happen to be null.
ALTER TABLE "desired_items" ADD COLUMN "item_name_confidence" TEXT;
