-- AlterTable: secondary_color is retired. Every two-tone row's second color
-- has already been preserved into color_name (e.g. "Brown / Black") and
-- color_family = 'multi' by scripts/backfillColorFamily.ts, run for real
-- against both the main and test databases and verified before this file
-- was written. This column is safe to drop now.
ALTER TABLE "wardrobe_items" DROP COLUMN "secondary_color";
