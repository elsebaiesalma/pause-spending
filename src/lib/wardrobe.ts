import { prisma } from "@/lib/prisma";
import { ensureWardrobeItemTagged } from "@/lib/tagging/tagWardrobeItem";
import type { Purchase, WardrobeItem } from "@prisma/client";

// Auto-seeds a wardrobe item from a confidently-extracted purchase. Only
// `active` purchases seed a wardrobe item - a `needs_review` draft's
// item_name/price/category are placeholders, not real data worth adding to
// the wardrobe yet. Idempotent per purchase (safe to call more than once
// for the same purchase, e.g. if seeding is ever re-run). Tags immediately
// at ingestion time, per the design.
export async function seedWardrobeItemFromPurchase(purchase: Purchase): Promise<void> {
  if (purchase.status !== "active") {
    return;
  }

  const alreadySeeded = await prisma.wardrobeItem.findFirst({
    where: { sourcePurchaseId: purchase.id },
  });
  if (alreadySeeded) {
    return;
  }

  const item = await prisma.wardrobeItem.create({
    data: {
      userId: purchase.userId,
      sourcePurchaseId: purchase.id,
      itemName: purchase.itemName,
      imageUrl: purchase.imageUrl,
      category: purchase.category,
      ownedSince: purchase.orderDate,
      status: "active",
    },
  });

  await ensureWardrobeItemTagged(item);
}

export type ManualWardrobeItemInput = {
  userId: string;
  itemName: string;
  category?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  styleTags?: string[];
  useCaseTags?: string[];
  imageUrl?: string | null;
  ownedSince?: Date | null;
};

// Adds a wardrobe item the user enters directly - gifts, hand-me-downs, or
// anything never bought online - never linked to a purchase row. If the
// user typed in any tag info themselves, that's respected as-is (never
// overwritten by auto-tagging); auto-tagging only fills in items left
// untagged.
export async function createManualWardrobeItem(
  input: ManualWardrobeItemInput
): Promise<WardrobeItem> {
  const userProvidedTags = Boolean(
    input.primaryColor || input.styleTags?.length || input.useCaseTags?.length
  );

  const item = await prisma.wardrobeItem.create({
    data: {
      userId: input.userId,
      itemName: input.itemName,
      category: input.category ?? null,
      primaryColor: input.primaryColor ?? null,
      secondaryColor: input.secondaryColor ?? null,
      styleTags: input.styleTags ?? [],
      useCaseTags: input.useCaseTags ?? [],
      imageUrl: input.imageUrl ?? null,
      ownedSince: input.ownedSince ?? null,
      status: "active",
      tagsExtractedAt: userProvidedTags ? new Date() : null,
    },
  });

  if (userProvidedTags) {
    return item;
  }

  return ensureWardrobeItemTagged(item);
}

export type WardrobeItemEditInput = {
  itemName?: string;
  category?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  styleTags?: string[];
  useCaseTags?: string[];
  imageUrl?: string | null;
  ownedSince?: Date | null;
};

// Edits any wardrobe item - auto-seeded or manually added alike. The user
// can freely correct/curate either kind, per the design's "separate,
// freely editable list" requirement.
export async function updateWardrobeItem(
  id: string,
  userId: string,
  input: WardrobeItemEditInput
): Promise<WardrobeItem> {
  return prisma.wardrobeItem.update({
    where: { id, userId },
    data: input,
  });
}

// Marks an item returned/no-longer-owned. This never deletes the row (or
// its linked purchase) - it only excludes the item from the active
// wardrobe going forward, per the design.
export async function markWardrobeItemReturned(
  id: string,
  userId: string
): Promise<WardrobeItem> {
  return prisma.wardrobeItem.update({
    where: { id, userId },
    data: { status: "returned" },
  });
}

export async function listActiveWardrobeItems(userId: string): Promise<WardrobeItem[]> {
  return prisma.wardrobeItem.findMany({
    where: { userId, status: "active" },
    orderBy: { ownedSince: "desc" },
  });
}
