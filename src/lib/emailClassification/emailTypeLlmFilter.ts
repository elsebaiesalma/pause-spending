import { ANTHROPIC_MODEL } from "@/lib/anthropicModel";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";
import type { ClassifiableTypeEmail } from "./emailTypeRules";

const EmailTypeSchema = z.object({
  type: z
    .enum(["order_confirmation", "shipping", "delivered", "return", "refund", "promo", "other"])
    .describe(
      "order_confirmation: the email that first confirms a specific order was placed and states what was bought. " +
        "shipping: a shipped/tracking/on-its-way update for an order already confirmed elsewhere. " +
        "delivered: a delivered/arrived/ready-for-pickup update. " +
        "return: a return initiated/return label/exchange notice. " +
        "refund: a refund issued/processed notice. " +
        "promo: marketing, recommendations, or a sale announcement not tied to a specific placed order. " +
        "other: none of the above (e.g. an account/security notice)."
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence given only the subject (and snippet, if provided). Use \"low\" when genuinely unclear."),
});

export type LLMEmailTypeClassification = z.infer<typeof EmailTypeSchema>;

const SYSTEM_PROMPT = `You classify order-related retail emails by what stage of the order lifecycle they represent, given only the subject line (and optionally a short snippet). Judge only from the given fields; don't assume anything not stated. Pick exactly one type.`;

export async function classifyEmailTypeByLLM(
  email: ClassifiableTypeEmail
): Promise<LLMEmailTypeClassification> {
  const response = await getAnthropicClient().messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [`Subject: ${email.subject}`, email.snippet ? `Snippet: ${email.snippet}` : undefined]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    output_config: {
      format: zodOutputFormat(EmailTypeSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Email type classification response failed to parse against the expected schema");
  }

  return response.parsed_output;
}
