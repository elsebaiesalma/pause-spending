import { prisma } from "@/lib/prisma";
import { seedWardrobeItemFromPurchase } from "@/lib/wardrobe";
import type { Purchase } from "@prisma/client";

export type ReviewConfirmation = {
  itemName: string;
  price: number;
  category: string;
};

// The user's side of the review queue the design requires: a
// low-confidence extraction (Step 7's `needs_review` placeholder) must be
// something the user can confirm (with corrections), or discard - never a
// row that's silently left in limbo forever. Confirming moves it to
// `active` with the corrected fields and seeds a wardrobe item exactly as
// a confident extraction would have, so review-queue purchases aren't a
// second-class path once resolved.
export async function confirmReviewPurchase(
  id: string,
  userId: string,
  input: ReviewConfirmation
): Promise<Purchase> {
  const purchase = await prisma.purchase.update({
    where: { id, userId, status: "needs_review" },
    data: {
      itemName: input.itemName,
      price: input.price.toString(),
      category: input.category,
      status: "active",
      userEdited: true,
    },
  });

  await seedWardrobeItemFromPurchase(purchase);

  return purchase;
}

// Discards a review-queue placeholder entirely - it was never real,
// confirmed spend or wardrobe data, so there's nothing to preserve.
export async function discardReviewPurchase(id: string, userId: string): Promise<void> {
  await prisma.purchase.delete({ where: { id, userId, status: "needs_review" } });
}
