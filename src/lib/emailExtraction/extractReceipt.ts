import { prisma } from "@/lib/prisma";
import { getMessageBody } from "@/lib/gmail/fetchMessages";
import { classifyEmailType } from "@/lib/emailClassification/classifyEmailType";
import { extractImageCandidates } from "./htmlUtils";
import { extractPurchaseItems } from "./llmExtractor";
import { deriveOrderReferenceFromSubject } from "./orderReference";
import { isReusedBrandingImage } from "./imageBranding";
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
// -> shipped -> delivered -> maybe returned/refunded). Only the
// confirmation email is trustworthy for item/price - the others restate
// the order (sometimes with a marketing/sale price that was never actually
// charged) rather than adding new purchase data, so only an
// "order_confirmation"-typed email is ever allowed to create a Purchase.
// When the LLM can identify the retailer's order number, that's used to
// recognize a later confirmation-typed email (e.g. a separate "receipt"
// email for the same order) as an update to an order already captured,
// rather than creating a second row for it.
export async function extractAndPersistPurchase(params: ExtractReceiptParams): Promise<void> {
  const { accessToken, userId, connectionId, message } = params;

  const alreadyExtracted = await prisma.purchase.findFirst({
    where: { userId, sourceEmailId: message.id },
  });
  if (alreadyExtracted) {
    return;
  }

  const emailType = await classifyEmailType({ subject: message.subject, snippet: message.snippet });
  if (emailType !== "order_confirmation") {
    return;
  }

  const html = await getMessageBody(accessToken, message.id);
  const imageCandidates = extractImageCandidates(html);
  const orderDate = new Date(Number(message.internalDate));
  const extraction = await extractPurchaseItems(
    { from: message.from, subject: message.subject, html },
    imageCandidates
  );
  const orderReference = extraction.orderReference ?? deriveOrderReferenceFromSubject(message.subject);

  const isConfident = extraction.confident && extraction.items.length > 0;

  if (orderReference) {
    const existingForOrder = await prisma.purchase.findMany({
      where: {
        userId,
        merchant: extraction.merchant,
        orderReference,
      },
    });

    if (existingForOrder.some((p) => p.status === "active" || p.userEdited)) {
      // This order was already fully captured by an earlier confirmation
      // email, or a human already corrected it - this is just a duplicate
      // confirmation-typed email for the same order, and re-parsing must
      // never overwrite a human correction even if the row is somehow
      // still needs_review.
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
    orderReference,
    orderDate,
  };

  if (!isConfident) {
    // fallbackItem?.imageUrl, if set, already went through the LLM's own
    // per-item matching against surrounding text. What this branch must
    // never do is fall back further to imageCandidates[0] - blindly taking
    // the first surviving candidate with no matching at all risks landing
    // on chrome (a masthead, a spacer) that happened to pass the per-email
    // filters. No confident match -> null (placeholder), never a guess.
    const fallbackItem = extraction.items[0];
    await prisma.purchase.create({
      data: {
        ...baseData,
        itemName: fallbackItem?.itemName ?? message.subject,
        price: fallbackItem?.price != null ? fallbackItem.price.toString() : null,
        category: fallbackItem?.category ?? "unknown",
        imageUrl: fallbackItem?.imageUrl ?? undefined,
        productLink: fallbackItem?.productLink ?? undefined,
        status: "needs_review",
      },
    });
    return;
  }

  for (const item of extraction.items) {
    const imageUrl =
      item.imageUrl && (await isReusedBrandingImage(userId, extraction.merchant, item.imageUrl, message.id))
        ? null
        : item.imageUrl;

    const purchase = await prisma.purchase.create({
      data: {
        ...baseData,
        itemName: item.itemName,
        price: item.price === null ? null : item.price.toString(),
        category: item.category,
        imageUrl: imageUrl ?? undefined,
        productLink: item.productLink ?? undefined,
        status: item.price === null ? "needs_review" : "active",
      },
    });

    if (item.price !== null) {
      await seedWardrobeItemFromPurchase(purchase);
    }
  }
}
