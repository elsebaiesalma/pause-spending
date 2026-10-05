import { ANTHROPIC_MODEL } from "@/lib/anthropicModel";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";
import type { ClassifiableEmail } from "./ruleBasedFilter";

const ClassificationSchema = z.object({
  in_scope: z
    .boolean()
    .describe(
      "True only if this is an order confirmation, shipping/delivery notice, receipt, or return for clothing, shoes, or accessories specifically."
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "Confidence in this classification given only the sender and subject (and snippet, if provided). Use \"low\" whenever the sender/subject genuinely doesn't make the category clear."
    ),
});

export type LLMClassification = z.infer<typeof ClassificationSchema>;

const SYSTEM_PROMPT = `You classify emails for a personal shopping-tracker app. Given an email's sender, subject, and optionally a short snippet, decide whether it is specifically about a clothing, shoe, or accessory purchase (an order confirmation, shipping/delivery notice, receipt, or return) - as opposed to any other kind of email (other product categories, bills, subscriptions, reservations, newsletters, etc.). Judge only from the given fields; don't assume anything not stated.`;

export async function classifyEmailByLLM(
  email: ClassifiableEmail & { snippet?: string }
): Promise<LLMClassification> {
  const response = await getAnthropicClient().messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `From: ${email.from}`,
          `Subject: ${email.subject}`,
          email.snippet ? `Snippet: ${email.snippet}` : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    output_config: {
      format: zodOutputFormat(ClassificationSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("LLM classification response failed to parse against the expected schema");
  }

  return response.parsed_output;
}
