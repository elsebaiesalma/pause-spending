import { prisma } from "@/lib/prisma";
import type { DesiredItem, WardrobeItem } from "@prisma/client";
import { ensureDesiredItemTagged } from "@/lib/tagging/tagDesiredItem";
import { findSimilarWardrobeItems } from "@/lib/tagging/similarity";
import { generateRedundancyExplanation } from "./redundancyExplanation";
import { matchReason } from "./matchReason";
import { getReflectionAnswer, type ReflectionAnswer } from "./reflection";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";

export type BudgetImpact =
  | { hasBudget: false; monthKey: string; spend: number }
  // A set budget but no known price for this item - never silently treated
  // as $0 spend, which would understate the real impact. The UI must show
  // an explicit "add a price to see the effect" state, not a computed number.
  | { hasBudget: true; priceKnown: false; monthKey: string; budgetAmount: number; spend: number; remaining: number }
  | {
      hasBudget: true;
      priceKnown: true;
      monthKey: string;
      budgetAmount: number;
      spend: number;
      remaining: number;
      spendAfterPurchase: number;
      remainingAfterPurchase: number;
    };

export type PauseScreenPayload = {
  desiredItem: DesiredItem;
  similarItems: WardrobeItem[];
  // Keyed by WardrobeItem.id - a short, honest reason each item was
  // shortlisted (e.g. "same color · same category"), never a fabricated
  // similarity score. See matchReason.ts.
  similarItemReasons: Record<string, string>;
  redundancyExplanation: string | null;
  budget: BudgetImpact;
  reflection: ReflectionAnswer | null;
};

async function computeBudgetImpact(userId: string, itemPrice: number | null): Promise<BudgetImpact> {
  const monthKey = currentMonthKey();
  const [budget, spend] = await Promise.all([
    getBudgetForMonth(userId, monthKey),
    getMonthSpend(userId, monthKey),
  ]);

  if (!budget) {
    return { hasBudget: false, monthKey, spend };
  }

  const budgetAmount = Number(budget.amount);
  const remaining = budgetAmount - spend;

  if (itemPrice === null) {
    return { hasBudget: true, priceKnown: false, monthKey, budgetAmount, spend, remaining };
  }

  const spendAfterPurchase = spend + itemPrice;
  return {
    hasBudget: true,
    priceKnown: true,
    monthKey,
    budgetAmount,
    spend,
    remaining,
    spendAfterPurchase,
    remainingAfterPurchase: budgetAmount - spendAfterPurchase,
  };
}

// Assembles the full pause-decision-screen payload for a confirmed desired
// item: tags the item if needed, shortlists similar wardrobe items, gets
// the AI redundancy explanation for that shortlist, and computes the
// budget impact - the first place Steps 10, 11, and 12 come together into
// one user-facing flow (design section 4, "Pause Decision Screen").
export async function assemblePauseScreen(
  userId: string,
  desiredItemId: string
): Promise<PauseScreenPayload> {
  const item = await prisma.desiredItem.findUniqueOrThrow({
    where: { id: desiredItemId, userId },
  });

  // The two model calls on this path are extras: matching, the per-item
  // reasons and the budget all work without them. A failed call (no key, an
  // outage, a rate limit) must leave the screen usable, not take it down.
  const tagged = await ensureDesiredItemTagged(item).catch((error) => {
    console.error("Pause screen: tagging failed, continuing untagged", error);
    return item;
  });

  const probe = {
    category: tagged.category,
    colorFamily: tagged.colorFamily,
    styleTags: tagged.styleTags,
    itemName: tagged.itemName,
  };

  const [similarItems, reflection] = await Promise.all([
    findSimilarWardrobeItems(userId, probe),
    getReflectionAnswer(desiredItemId, userId),
  ]);

  const redundancyExplanation = await generateRedundancyExplanation(tagged, similarItems).catch((error) => {
    console.error("Pause screen: redundancy explanation failed, showing without it", error);
    return null;
  });

  const similarItemReasons: Record<string, string> = {};
  for (const similarItem of similarItems) {
    similarItemReasons[similarItem.id] = matchReason(probe, similarItem);
  }

  const itemPrice = tagged.price ? Number(tagged.price) : null;
  const budget = await computeBudgetImpact(userId, itemPrice);

  return {
    desiredItem: tagged,
    similarItems,
    similarItemReasons,
    redundancyExplanation,
    budget,
    reflection,
  };
}
