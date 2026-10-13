import { z } from "zod";
import { MAX_PIECES } from "./placements";

export const placementSchema = z.object({
  wardrobeItemId: z.uuid(),
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().finite(),
  zOrder: z.number().finite(),
});

export const saveLookSchema = z.object({
  name: z.string().max(60).optional(),
  inspiredByDesiredItemId: z.uuid().nullable().optional(),
  placements: z.array(placementSchema).max(MAX_PIECES),
});

export const renameLookSchema = z.object({ name: z.string().trim().min(1).max(60) });
