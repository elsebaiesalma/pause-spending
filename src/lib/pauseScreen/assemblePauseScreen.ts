import { prisma } from "@/lib/prisma";
import type { DesiredItem, WardrobeItem } from "@prisma/client";
import { ensureDesiredItemTagged } from "@/lib/tagging/tagDesiredItem";
import { findSimilarWardrobeItems } from "@/lib/tagging/similarity";
import { generateRedundancyExplanation } from "./redundancyExplanation";
import { currentMonthKey, getBudgetForMonth, getMonthSpend } from "@/lib/budget";

export type BudgetImpact =
  | { hasBudget: false; monthKey: string; spend: number }
  | {
      hasBudget: true;
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
  redundancyExplanation: string | null;
  budget: BudgetImpact;
};

async function computeBudgetImpact(userId: string, itemPrice: number): Promise<BudgetImpact> {
  const monthKey = currentMonthKey();
  const [budget, spend] = await Promise.all([
    getBudgetForMonth(userId, monthKey),
    getMonthSpend(userId, monthKey),
  ]);

  if (!budget) {
    return { hasBudget: false, monthKey, spend };
  }

  const budgetAmount = Number(budget.amount);
  const spendAfterPurchase = spend + itemPrice;
  return {
    hasBudget: true,
    monthKey,
    budgetAmount,
    spend,
    remaining: budgetAmount - spend,
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

  const tagged = await ensureDesiredItemTagged(item);

  const similarItems = await findSimilarWardrobeItems(userId, {
    category: tagged.category,
    primaryColor: tagged.primaryColor,
    styleTags: tagged.styleTags,
  });

  const redundancyExplanation = await generateRedundancyExplanation(tagged, similarItems);

  const itemPrice = tagged.price ? Number(tagged.price) : 0;
  const budget = await computeBudgetImpact(userId, itemPrice);

  return { desiredItem: tagged, similarItems, redundancyExplanation, budget };
}
