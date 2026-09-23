import { prisma } from "@/lib/prisma";
import { getMessageBody } from "@/lib/gmail/fetchMessages";
import { extractImageCandidates } from "./htmlUtils";
import { extractPurchaseItems } from "./llmExtractor";
import { seedWardrobeItemFromPurchase } from "@/lib/wardrobe";
import type { GmailMessageSummary } from "@/lib/gmail/fetchMessages";

export type ExtractReceiptParams = {
  accessToken: string;
  userId: string;
  connectionId: string;
  message: GmailMessageSummary;
};

// Extracts and persists purchase row(s) for one already in-scope-classified
// email. Confident extractions become one `active` row per item found;
// anything the LLM couldn't confidently extract becomes a single
// `needs_review` draft row instead of being silently discarded, per the
// design's error handling. Idempotent per message: re-running a backfill
// over the same email never creates duplicate rows.
//
// A single real order is typically split across several emails (confirmed
// -> shipped -> delivered), and only the confirmation usually states the
// item/price - the rest legitimately extract nothing. When the LLM can
// identify the retailer's order number, that's used to recognize later
// emails as updates to an order already captured, rather than creating a
// review-queue row per shipping notification for the same order.
export async function extractAndPersistPurchase(params: ExtractReceiptParams): Promise<void> {
  const { accessToken, userId, connectionId, message } = params;

  const alreadyExtracted = await prisma.purchase.findFirst({
    where: { userId, sourceEmailId: message.id },
  });
  if (alreadyExtracted) {
    return;
  }

  const html = await getMessageBody(accessToken, message.id);
  const imageCandidates = extractImageCandidates(html);
  const orderDate = new Date(Number(message.internalDate));
  const extraction = await extractPurchaseItems(
    { from: message.from, subject: message.subject, html },
    imageCandidates
  );

  const isConfident = extraction.confident && extraction.items.length > 0;

  if (extraction.orderReference) {
    const existingForOrder = await prisma.purchase.findMany({
      where: {
        userId,
        merchant: extraction.merchant,
        orderReference: extraction.orderReference,
      },
    });

    if (existingForOrder.some((p) => p.status === "active")) {
      // This order was already fully captured by an earlier confirmation
      // email - this is just a later shipping/delivery update for it.
      return;
    }

    if (existingForOrder.length > 0 && !isConfident) {
      // Already have a needs_review placeholder for this order and this
      // email doesn't add any new information.
      return;
    }

    if (existingForOrder.length > 0 && isConfident) {
      // This email finally reveals the order's real items - replace the
      // earlier placeholder(s) rather than leaving stale duplicates.
      await prisma.purchase.deleteMany({
        where: { id: { in: existingForOrder.map((p) => p.id) } },
      });
    }
  }

  const baseData = {
    userId,
    sourceEmailConnectionId: connectionId,
    sourceEmailId: message.id,
    merchant: extraction.merchant,
    orderReference: extraction.orderReference,
    orderDate,
  };

  if (!isConfident) {
    const fallbackItem = extraction.items[0];
    await prisma.purchase.create({
      data: {
        ...baseData,
        itemName: fallbackItem?.itemName ?? message.subject,
        price: (fallbackItem?.price ?? 0).toString(),
        category: fallbackItem?.category ?? "unknown",
        imageUrl: fallbackItem?.imageUrl ?? imageCandidates[0]?.imageUrl,
        productLink: fallbackItem?.productLink ?? imageCandidates[0]?.productLink,
        status: "needs_review",
      },
    });
    return;
  }

  for (const item of extraction.items) {
    const purchase = await prisma.purchase.create({
      data: {
        ...baseData,
        itemName: item.itemName,
        price: item.price.toString(),
        category: item.category,
        imageUrl: item.imageUrl ?? undefined,
        productLink: item.productLink ?? undefined,
        status: "active",
      },
    });
    await seedWardrobeItemFromPurchase(purchase);
  }
}
