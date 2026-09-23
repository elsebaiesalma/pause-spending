import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";
import { cleanHtmlForExtraction } from "./htmlUtils";

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
      })
    )
    .describe(
      "One entry per distinct purchased item found in the email. Empty if no specific item/price can be identified."
    ),
});

export type ReceiptExtraction = z.infer<typeof ExtractionSchema>;

const SYSTEM_PROMPT = `You extract structured purchase details from clothing/shoe/accessory order-confirmation, shipping, or receipt emails for a personal shopping tracker. Given the email's sender, subject, and HTML body, identify the merchant, the retailer's order number if stated (even in a shipping/delivery update that has no item details), and every distinct item purchased with its price and a short category. If the email doesn't clearly state a specific item and price (e.g. it's a generic shipping/tracking update with no item details), set confident to false - still report the order number if you can find one.`;

export async function extractPurchaseItems(email: {
  from: string;
  subject: string;
  html: string;
}): Promise<ReceiptExtraction> {
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

  return response.parsed_output;
}
