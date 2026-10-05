import { REDUNDANCY_MODEL } from "@/lib/anthropicModels";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";
import { normalizeAiText } from "@/lib/text";
import type { DesiredItem, WardrobeItem } from "@prisma/client";

const ExplanationSchema = z.object({
  explanation: z
    .string()
    .min(1)
    .describe(
      "One or two calm, specific, nonjudgmental sentences explaining why the desired item may be redundant, referencing at least one actual overlapping attribute (color, style, category, or how recently a similar item was bought) from the shortlist below. Never preachy or guilt-inducing."
    ),
});

const SYSTEM_PROMPT = `You help someone pause and reflect before a clothing/shoe/accessory purchase by pointing out, calmly and without judgment, what they already own that's similar to what they're considering. Reference specific, real overlapping attributes (color, style, category, recency of purchase) from the wardrobe items given - never invent an attribute that isn't in the data, and never guilt-trip or lecture.`;

// Generates the "why this may be redundant" explanation for a desired item
// against its already-shortlisted similar wardrobe items (the shortlist
// itself comes from the cheap tag-matching stage in similarity.ts) - the
// AI pass runs only over this bounded shortlist, never the whole wardrobe.
export async function generateRedundancyExplanation(
  desiredItem: Pick<DesiredItem, "itemName" | "category" | "colorName" | "colorFamily" | "styleTags">,
  shortlist: WardrobeItem[]
): Promise<string | null> {
  if (shortlist.length === 0) {
    return null;
  }

  // The explanation is prose for a human, so prefer the richer free-text
  // colorName (e.g. "Espresso") when there is one, falling back to the
  // coarser colorFamily (e.g. "brown") only when colorName is unset - this
  // is the one place the single colorFamily value alone would read as a
  // flatter, less specific explanation than the old primaryColor free text did.
  const colorFor = (item: Pick<DesiredItem, "colorName" | "colorFamily">) =>
    item.colorName ?? item.colorFamily ?? "unknown";

  const textContent = [
    `Desired item: ${desiredItem.itemName ?? "unnamed item"}`,
    `Category: ${desiredItem.category ?? "unknown"}`,
    `Color: ${colorFor(desiredItem)}`,
    `Style tags: ${desiredItem.styleTags.join(", ") || "none"}`,
    "",
    "Already-owned similar items:",
    ...shortlist.map((item, i) =>
      [
        `${i + 1}. ${item.itemName}`,
        `   category: ${item.category ?? "unknown"}`,
        `   color: ${colorFor(item)}`,
        `   style tags: ${item.styleTags.join(", ") || "none"}`,
        `   owned since: ${item.ownedSince ? item.ownedSince.toISOString().slice(0, 10) : "unknown"}`,
      ].join("\n")
    ),
  ].join("\n");

  const response = await getAnthropicClient().messages.parse({
    model: REDUNDANCY_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: textContent }],
    output_config: {
      format: zodOutputFormat(ExplanationSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Redundancy explanation response failed to parse against the expected schema");
  }

  return normalizeAiText(response.parsed_output.explanation);
}
