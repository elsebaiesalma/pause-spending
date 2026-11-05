import { prisma } from "@/lib/prisma";
import { extractWardrobeItemTags } from "./llmTagger";
import type { DesiredItem } from "@prisma/client";

// Runs the same tag-extraction call used for wardrobe items (Step 11)
// against a confirmed desired item, so the shortlist query has a probe to
// match against. `desired_items` has no dedicated "tagged" flag - a
// non-null category is the signal that extraction already ran, mirroring
// how `wardrobe_items.tagsExtractedAt` is used, so a call against an
// already-tagged item is a no-op rather than a re-computation. Also skips
// entirely once the user has confirmed the item - even an intentionally
// blank category is a human choice the auto-tagger must never overwrite.
export async function ensureDesiredItemTagged(item: DesiredItem): Promise<DesiredItem> {
  if (item.category || item.userEdited) {
    return item;
  }

  const tags = await extractWardrobeItemTags({
    itemName: item.itemName ?? "",
    category: null,
    imageUrl: item.imageUrl,
  });

  return prisma.desiredItem.update({
    where: { id: item.id, userId: item.userId },
    data: {
      category: tags.category,
      colorFamily: tags.colorFamily,
      styleTags: tags.styleTags,
    },
  });
}
