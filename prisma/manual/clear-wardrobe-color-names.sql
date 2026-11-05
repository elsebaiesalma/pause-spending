-- Colour names were written by the tagging model and are no longer shown or
-- written. Clearing them means every card shows the colour the person chose
-- (or the family), not a model's guess. Run on BOTH Neon branches (main, test).
-- Safe to re-run. No schema change, so no migration record is needed.
UPDATE wardrobe_items SET color_name = NULL;
