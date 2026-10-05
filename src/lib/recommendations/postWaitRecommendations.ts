import { ANTHROPIC_MODEL } from "@/lib/anthropicModel";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";
import { normalizeAiText } from "@/lib/text";
import type { DesiredItem, WardrobeItem } from "@prisma/client";

export type Alternative = {
  name: string;
  estimatedPrice: number | null;
  note: string;
};

const AlternativesSchema = z.object({
  comparables: z
    .array(
      z.object({
        name: z.string().min(1).describe("A plausible lower-priced comparable item."),
        estimatedPrice: z.number().nonnegative().nullable().describe("Best-guess price, or null if unsure."),
        note: z.string().describe("Why this is a reasonable comparable (style, use-case, etc.)."),
      })
    )
    .describe("0-3 best-guess, lower-priced comparable items. These are guesses, not real listings."),
  secondhand: z
    .array(
      z.object({
        name: z.string().min(1).describe("A plausible secondhand/resale find, e.g. 'pre-owned on Poshmark'."),
        estimatedPrice: z.number().nonnegative().nullable().describe("Best-guess price, or null if unsure."),
        note: z.string().describe("Why this is a reasonable secondhand option."),
      })
    )
    .describe("0-3 best-guess secondhand/resale suggestions. These are guesses, not real listings."),
});

const ALTERNATIVES_SYSTEM_PROMPT = `You suggest lower-priced comparable items and secondhand/resale alternatives for someone considering a clothing/shoe/accessory purchase. These are your best guesses based on general knowledge of the market for this kind of item - not real, live listings. Never claim a suggestion is a real, currently-available product; keep notes short and honest about that.`;

// Best-guess (not live-searched) lower-priced comparables and secondhand
// options for a desired item - per the design, this is explicitly an
// AI best-guess with no external search call, so the UI must label these
// as suggestions, never verified listings.
export async function generateShoppingAlternatives(
  desiredItem: Pick<DesiredItem, "itemName" | "price" | "category">
): Promise<{ comparables: Alternative[]; secondhand: Alternative[] }> {
  const response = await getAnthropicClient().messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: ALTERNATIVES_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `Item: ${desiredItem.itemName ?? "unnamed item"}`,
          desiredItem.price ? `Price: $${Number(desiredItem.price).toFixed(2)}` : undefined,
          desiredItem.category ? `Category: ${desiredItem.category}` : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    output_config: {
      format: zodOutputFormat(AlternativesSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Shopping alternatives response failed to parse against the expected schema");
  }

  const normalize = (alt: Alternative): Alternative => ({
    ...alt,
    name: normalizeAiText(alt.name),
    note: normalizeAiText(alt.note),
  });

  return {
    comparables: response.parsed_output.comparables.map(normalize),
    secondhand: response.parsed_output.secondhand.map(normalize),
  };
}

export type OutfitIdea = {
  wardrobeItem: WardrobeItem;
  suggestion: string;
};

const OutfitIdeasSchema = z.object({
  ideas: z
    .array(
      z.object({
        wardrobeItemId: z.string().describe("The id of one of the candidate wardrobe items given below."),
        suggestion: z
          .string()
          .min(1)
          .describe("A short outfit idea pairing the desired item with this owned wardrobe item."),
      })
    )
    .describe("0-3 outfit ideas, each referencing one of the given candidate wardrobe items by its id."),
});

const OUTFIT_IDEAS_SYSTEM_PROMPT = `You suggest short, concrete outfit ideas pairing a desired new item with items the user already owns. Only ever reference wardrobe items from the candidate list you're given, by their exact id - never invent an item that isn't in that list.`;

// Generates outfit-idea text suggestions grounded in the user's real,
// existing wardrobe (design: "text suggestions that reference the user's
// existing wardrobe photos", not a generated composite image). Any
// suggestion the model returns for a wardrobeItemId outside the given
// candidates is dropped rather than shown, so a hallucinated reference
// can never reach the user.
export async function generateOutfitIdeas(
  desiredItem: Pick<DesiredItem, "itemName" | "category">,
  candidates: WardrobeItem[]
): Promise<OutfitIdea[]> {
  if (candidates.length === 0) {
    return [];
  }

  const response = await getAnthropicClient().messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: OUTFIT_IDEAS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `Desired item: ${desiredItem.itemName ?? "unnamed item"} (${desiredItem.category ?? "unknown category"})`,
          "",
          "Candidate wardrobe items:",
          ...candidates.map((item) => `- id: ${item.id}, name: ${item.itemName}, category: ${item.category ?? "unknown"}`),
        ].join("\n"),
      },
    ],
    output_config: {
      format: zodOutputFormat(OutfitIdeasSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Outfit idea response failed to parse against the expected schema");
  }

  const byId = new Map(candidates.map((item) => [item.id, item]));
  const ideas: OutfitIdea[] = [];
  for (const idea of response.parsed_output.ideas) {
    const wardrobeItem = byId.get(idea.wardrobeItemId);
    if (wardrobeItem) {
      ideas.push({ wardrobeItem, suggestion: normalizeAiText(idea.suggestion) });
    }
  }
  return ideas;
}
