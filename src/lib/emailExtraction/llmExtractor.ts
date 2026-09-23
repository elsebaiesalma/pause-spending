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
          .describe("Price of this item in the order's currency, as a plain number."),
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
  confident: boolean;
  items: {
    itemName: string;
    price: number;
    category: string;
    imageUrl: string | null;
    productLink: string | null;
  }[];
};

const SYSTEM_PROMPT = `You extract structured purchase details from clothing/shoe/accessory order-confirmation, shipping, or receipt emails for a personal shopping tracker. Given the email's sender, subject, and HTML body, identify the merchant, the retailer's order number if stated (even in a shipping/delivery update that has no item details), and every distinct item purchased with its price and a short category. If the email doesn't clearly state a specific item and price (e.g. it's a generic shipping/tracking update with no item details), set confident to false - still report the order number if you can find one.

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

export async function extractPurchaseItems(
  email: { from: string; subject: string; html: string },
  imageCandidates: ImageCandidate[] = []
): Promise<ReceiptExtraction> {
  const response = await getAnthropicClient().messages.parse({
    model: "claude-opus-5",
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
// pointing at the wrong image or throwing.
function resolveImageIndices(raw: RawExtraction, candidates: ImageCandidate[]): ReceiptExtraction {
  return {
    ...raw,
    items: raw.items.map((item) => {
      const candidate =
        item.imageIndex !== null ? candidates[item.imageIndex - 1] : undefined;
      return {
        itemName: item.itemName,
        price: item.price,
        category: item.category,
        imageUrl: candidate?.imageUrl ?? null,
        productLink: candidate?.productLink ?? null,
      };
    }),
  };
}
