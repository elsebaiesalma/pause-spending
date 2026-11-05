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
  // Only used to order the shortlist (see rankSimilarItems), never to decide
  // who is on it.
  itemName?: string | null;
};

function lastWord(name: string | null | undefined): string | null {
  const word = name?.trim().split(/\s+/).pop()?.toLowerCase();
  return word ? word : null;
}

// Puts the closest owned piece first. The shortlist alone has no order, and
// the pause screen shows its first item next to the wanted one, so without
// this a white tee could be shown beside a green tank that merely shares a
// tag. Same colour family counts most, then each shared tag, then the garment
// word at the end of the name ("Tee" with "Tee", not with "Tank"), which breaks
// ties between pieces that tag identically. Equal scores keep their fetch order.
export function rankSimilarItems<T extends WardrobeItem>(items: T[], probe: SimilarityProbe): T[] {
  const shared = (a: string[] | undefined, b: string[]) => (a ?? []).filter((tag) => b.includes(tag)).length;
  const noun = lastWord(probe.itemName);
  const score = (item: WardrobeItem) =>
    (probe.colorFamily && item.colorFamily === probe.colorFamily ? 4 : 0) +
    shared(probe.styleTags, item.styleTags) +
    shared(probe.useCaseTags, item.useCaseTags) +
    (noun && lastWord(item.itemName) === noun ? 0.5 : 0);
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

// Shortlists active wardrobe items with meaningful overlap against a
// probe (e.g. a desired item's own extracted tags): same category is
// required, plus at least one of a matching color family, an
// overlapping style tag, or an overlapping use-case tag. This is the
// fast, cheap first stage of the hybrid similarity approach - it keeps
// the shortlist small and genuinely related rather than "everything in
// this category" - with an AI pass over the shortlist (a later step)
// generating the human-readable redundancy explanation.
// A piece made from an order keeps its brand on the purchase, so the
// shortlist carries the merchant for display.
export type SimilarWardrobeItem = WardrobeItem & { sourcePurchase?: { merchant: string } | null };

export async function findSimilarWardrobeItems(
  userId: string,
  probe: SimilarityProbe
): Promise<SimilarWardrobeItem[]> {
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

  const items = await prisma.wardrobeItem.findMany({
    where: {
      userId,
      status: "active",
      category: probe.category,
      OR: overlapConditions,
      ...devWardrobeWhere(),
    },
    orderBy: { id: "asc" },
    include: { sourcePurchase: { select: { merchant: true } } },
  });
  return rankSimilarItems(items, probe);
}
