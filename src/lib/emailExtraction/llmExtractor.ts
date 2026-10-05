import { ANTHROPIC_MODEL } from "@/lib/anthropicModel";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";
import { cleanHtmlForExtraction, type ImageCandidate } from "./htmlUtils";

const ExtractionSchema = z.object({
  merchant: z
    .string()
    .min(1)
    .describe("The retailer/brand name, e.g. 'Nike', 'H&M', 'Revolve'."),
  orderReference: z
    .string()
    .nullable()
    .describe(
      "The retailer's own order number, if stated anywhere in the email (e.g. '#12345', '30688409'), even if this particular email is just a shipping/delivery update with no item/price details. Null if no order number is stated."
    ),
  subtotal: z
    .number()
    .nonnegative()
    .nullable()
    .describe(
      "The order's stated merchandise subtotal (items only, before tax/shipping/discounts applied at checkout), if this email explicitly states one. Null if no subtotal line is present. Never the order's grand total - only the line specifically labeled subtotal/merchandise total."
    ),
  confident: z
    .boolean()
    .describe(
      "True only if you can confidently identify at least one specific clothing/shoe/accessory item and its price from this email. False for generic shipping/tracking updates with no item details, or anything you're genuinely unsure about."
    ),
  items: z
    .array(
      z.object({
        itemName: z.string().min(1).describe("Name/description of the purchased item."),
        price: z
          .number()
          .nonnegative()
          .nullable()
          .describe(
            "This item's own per-item line price - the amount actually charged for just this item, never the order's total, subtotal, tax, or shipping charge. If the email shows both a current/sale price and a struck-through original price for this item, use the current price actually charged, never the struck-through one. Null if you cannot confidently isolate this specific item's own price - do not guess a number."
          ),
        category: z
          .string()
          .min(1)
          .describe("A short category label, e.g. 'tops', 'shoes', 'bags', 'outerwear'."),
        imageIndex: z
          .number()
          .int()
          .nullable()
          .describe(
            "The 1-based index, from the numbered candidate image list given below, of the photo that shows THIS specific item - matched by reading the text around each image, not by position alone. Null if none of the candidates clearly show this item. Never a number outside the given list."
          ),
      })
    )
    .describe(
      "One entry per distinct purchased item found in the email. Empty if no specific item/price can be identified."
    ),
});

type RawExtraction = z.infer<typeof ExtractionSchema>;

export type ReceiptExtraction = {
  merchant: string;
  orderReference: string | null;
  subtotal: number | null;
  confident: boolean;
  items: {
    itemName: string;
    price: number | null;
    category: string;
    imageUrl: string | null;
    productLink: string | null;
  }[];
};

const SYSTEM_PROMPT = `You extract structured purchase details from clothing/shoe/accessory order-confirmation, shipping, or receipt emails for a personal shopping tracker. Given the email's sender, subject, and HTML body, identify the merchant, the retailer's order number if stated (even in a shipping/delivery update that has no item details), the order's merchandise subtotal if explicitly stated, and every distinct item purchased with its own per-item line price and a short category. If the email doesn't clearly state a specific item and price (e.g. it's a generic shipping/tracking update with no item details), set confident to false - still report the order number if you can find one.

Price is per-item and per-line, never a total. Never use the order's grand total, the subtotal, tax, or shipping/handling charges as an item's price. When a table/row lists an item next to its own price, that row's price belongs to that row's item, not to any other item in the email. If an item's price shows a current price and a separate struck-through "was" price, use only the current price actually charged. If you can't confidently isolate one specific item's own price, set that item's price to null rather than guessing - do not substitute a total, an estimate, or another item's price.

You are also given a numbered list of candidate image URLs found in the email's HTML. For each item you identify, match it to the correct image by index - read the text immediately around each candidate (it's usually right next to the item it depicts) rather than assuming the Nth item pairs with the Nth image, since emails don't always list images and items in the same order. Use null when no candidate clearly matches. Only ever return an index that appears in the given list - never invent one.`;

function formatImageCandidates(candidates: ImageCandidate[]): string {
  if (candidates.length === 0) return "Candidate images: none found.";
  return [
    "Candidate images (match each item to one of these by index, or null if none fit):",
    ...candidates.map(
      (candidate, i) =>
        `${i + 1}. ${candidate.imageUrl}` +
        (candidate.productLink ? ` (linked to product page: ${candidate.productLink})` : "")
    ),
  ].join("\n");
}

// Tolerance for the multi-item subtotal-reconciliation check: rounding on
// per-item prices and the occasional small fee folded into "subtotal" by
// some retailers means an exact match isn't realistic - but a mismatch
// bigger than this is a real sign at least one line price is wrong (e.g.
// a struck-through "was" price got used instead of what was charged).
const RECONCILIATION_TOLERANCE_FRACTION = 0.02;
const RECONCILIATION_TOLERANCE_MIN = 1;

// Only meaningful (and only checked) for a multi-item order with a stated
// subtotal and every item's price successfully extracted - a single-item
// order's own price and the subtotal should be identical modulo rounding,
// which is still worth checking, but there's nothing to reconcile when any
// item price is already null or no subtotal was found at all.
export function pricesReconcileWithSubtotal(
  items: { price: number | null }[],
  subtotal: number | null
): boolean {
  if (subtotal === null) return true;
  if (items.some((item) => item.price === null)) return true;
  const sum = items.reduce((total, item) => total + (item.price as number), 0);
  const tolerance = Math.max(RECONCILIATION_TOLERANCE_MIN, subtotal * RECONCILIATION_TOLERANCE_FRACTION);
  return Math.abs(sum - subtotal) <= tolerance;
}

export async function extractPurchaseItems(
  email: { from: string; subject: string; html: string },
  imageCandidates: ImageCandidate[] = []
): Promise<ReceiptExtraction> {
  const response = await getAnthropicClient().messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `From: ${email.from}`,
          `Subject: ${email.subject}`,
          `Body:\n${cleanHtmlForExtraction(email.html)}`,
          "",
          formatImageCandidates(imageCandidates),
        ].join("\n"),
      },
    ],
    output_config: {
      format: zodOutputFormat(ExtractionSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Receipt extraction response failed to parse against the expected schema");
  }

  return resolveImageIndices(response.parsed_output, imageCandidates);
}

// Resolves each item's chosen index against the actual candidate list
// rather than trusting the model's index directly - an out-of-range
// index (hallucinated or off-by-one) becomes null instead of silently
// pointing at the wrong image or throwing. Also applies the subtotal
// reconciliation check: when a multi-item order's line prices don't add up
// to its stated subtotal, every item's price is genuinely suspect, so all
// of them become null (never guessed/kept) rather than persisting numbers
// that don't actually reconcile with what the email itself states was
// charged.
function resolveImageIndices(raw: RawExtraction, candidates: ImageCandidate[]): ReceiptExtraction {
  const reconciles = pricesReconcileWithSubtotal(raw.items, raw.subtotal);
  return {
    ...raw,
    items: raw.items.map((item) => {
      const candidate =
        item.imageIndex !== null ? candidates[item.imageIndex - 1] : undefined;
      return {
        itemName: item.itemName,
        price: reconciles ? item.price : null,
        category: item.category,
        imageUrl: candidate?.imageUrl ?? null,
        productLink: candidate?.productLink ?? null,
      };
    }),
  };
}
