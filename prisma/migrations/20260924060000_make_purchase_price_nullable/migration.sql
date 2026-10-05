-- AlterTable: purely a constraint relaxation, no data loss - every existing
-- row keeps its current price value, this only allows *future* rows to
-- store null when extraction can't confidently isolate a price. Backs the
-- "ambiguous or missing price -> null + needs_review, never a guess" fix
-- for receipt extraction.
ALTER TABLE "purchases" ALTER COLUMN "price" DROP NOT NULL;
