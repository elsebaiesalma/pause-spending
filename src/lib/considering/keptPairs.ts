import type { DesiredItem, WardrobeItem } from "@prisma/client";
import { findSimilarWardrobeItems } from "@/lib/tagging/similarity";

// The piece you already own that "won" when something was let go: the same
// closest match the pause screen put next to it (first of the rule-based
// shortlist, since matching has no finer ranking). Items let go before they
// were tagged simply have no pair. Never calls the model: it only reads tags
// that already exist.
export async function getClosestOwned(userId: string, item: DesiredItem): Promise<WardrobeItem | null> {
  if (!item.category) return null;
  const similar = await findSimilarWardrobeItems(userId, {
    category: item.category,
    colorFamily: item.colorFamily,
    styleTags: item.styleTags,
  });
  return similar[0] ?? null;
}

export async function getKeptPairs(userId: string, items: DesiredItem[]): Promise<Record<string, WardrobeItem>> {
  const pairs = await Promise.all(items.map(async (item) => [item.id, await getClosestOwned(userId, item)] as const));
  const result: Record<string, WardrobeItem> = {};
  for (const [id, owned] of pairs) {
    if (owned) result[id] = owned;
  }
  return result;
}
