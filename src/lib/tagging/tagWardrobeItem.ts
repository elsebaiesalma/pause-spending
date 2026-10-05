import { prisma } from "@/lib/prisma";
import { extractWardrobeItemTags } from "./llmTagger";
import type { WardrobeItem } from "@prisma/client";

// Runs tag extraction for a wardrobe item exactly once, cached via
// tagsExtractedAt. Safe to call from every ingestion path (auto-seeded or
// manually added) - a call against an already-tagged item is a no-op,
// never a re-computation.
export async function ensureWardrobeItemTagged(item: WardrobeItem): Promise<WardrobeItem> {
  if (item.tagsExtractedAt) {
    return item;
  }

  const tags = await extractWardrobeItemTags({
    itemName: item.itemName,
    category: item.category,
    imageUrl: item.imageUrl,
  });

  return prisma.wardrobeItem.update({
    where: { id: item.id, userId: item.userId },
    data: {
      category: tags.category,
      colorName: tags.colorName,
      colorFamily: tags.colorFamily,
      styleTags: tags.styleTags,
      useCaseTags: tags.useCaseTags,
      tagsExtractedAt: new Date(),
    },
  });
}
