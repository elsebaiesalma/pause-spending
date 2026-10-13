import { prisma } from "@/lib/prisma";
import { devWardrobeWhere } from "@/lib/devWardrobeView";
import { Prisma, type WardrobeItem } from "@prisma/client";

export type SimilarityProbe = {
  category: string | null;
  // Redundancy matching uses only colorFamily, never colorName (free-text
  // display color) - see src/lib/colorFamily.ts. Null means "unknown, skip
  // this dimension": it is never itself a match, and never itself a
  // non-match against a candidate's own null or non-null colorFamily - the
  // shortlist still forms from category plus any other overlapping
  // dimension (style/use-case tags).
  colorFamily?: string | null;
  styleTags?: string[];
  useCaseTags?: string[];
};

// Shortlists active wardrobe items with meaningful overlap against a
// probe (e.g. a desired item's own extracted tags): same category is
// required, plus at least one of a matching color family, an
// overlapping style tag, or an overlapping use-case tag. This is the
// fast, cheap first stage of the hybrid similarity approach - it keeps
// the shortlist small and genuinely related rather than "everything in
// this category" - with an AI pass over the shortlist (a later step)
// generating the human-readable redundancy explanation.
export async function findSimilarWardrobeItems(
  userId: string,
  probe: SimilarityProbe
): Promise<WardrobeItem[]> {
  if (!probe.category) {
    return [];
  }

  const overlapConditions: Prisma.WardrobeItemWhereInput[] = [];
  if (probe.colorFamily) {
    overlapConditions.push({ colorFamily: probe.colorFamily });
  }
  if (probe.styleTags && probe.styleTags.length > 0) {
    overlapConditions.push({ styleTags: { hasSome: probe.styleTags } });
  }
  if (probe.useCaseTags && probe.useCaseTags.length > 0) {
    overlapConditions.push({ useCaseTags: { hasSome: probe.useCaseTags } });
  }

  if (overlapConditions.length === 0) {
    return [];
  }

  return prisma.wardrobeItem.findMany({
    where: {
      userId,
      status: "active",
      category: probe.category,
      OR: overlapConditions,
      ...devWardrobeWhere(),
    },
  });
}
