import { prisma } from "@/lib/prisma";
import type { DesiredItem } from "@prisma/client";
import { listActiveWardrobeItems } from "@/lib/wardrobe";
import {
  generateOutfitIdeas,
  generateShoppingAlternatives,
  type Alternative,
  type OutfitIdea,
} from "./postWaitRecommendations";

export type RecommendationsPayload = {
  desiredItem: DesiredItem;
  comparables: Alternative[];
  secondhand: Alternative[];
  outfitIdeas: OutfitIdea[];
};

// Assembles the post-wait/post-proceed recommendations payload (design
// section 4, "Post-Wait Recommendations"): AI best-guess comparables and
// secondhand suggestions, plus outfit ideas grounded in the user's actual
// active wardrobe - never the full wardrobe history, so a returned item
// never turns up as an outfit suggestion.
export async function assembleRecommendations(
  userId: string,
  desiredItemId: string
): Promise<RecommendationsPayload> {
  const desiredItem = await prisma.desiredItem.findUniqueOrThrow({
    where: { id: desiredItemId, userId },
  });

  const wardrobeItems = await listActiveWardrobeItems(userId);

  const [{ comparables, secondhand }, outfitIdeas] = await Promise.all([
    generateShoppingAlternatives(desiredItem),
    generateOutfitIdeas(desiredItem, wardrobeItems),
  ]);

  return { desiredItem, comparables, secondhand, outfitIdeas };
}
