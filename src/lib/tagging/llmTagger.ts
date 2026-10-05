import { TAGGING_MODEL } from "@/lib/anthropicModels";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import type Anthropic from "@anthropic-ai/sdk";

const TagSchema = z.object({
  category: z
    .string()
    .min(1)
    .describe("A short category label, e.g. 'tops', 'shoes', 'bags', 'outerwear', 'dresses'."),
  // Free text for display only (e.g. "Espresso") - never used in redundancy
  // matching. See colorFamily.
  colorName: z.string().nullable().describe("The item's dominant color as a natural, specific name, or null if unclear."),
  // Redundancy matching (similarity.ts) uses only this field, never
  // colorName. A two-tone/patterned item is "multi", not two separate colors.
  colorFamily: z
    .enum(COLOR_FAMILIES)
    .nullable()
    .describe("The item's color family - the single closest match, or 'multi' for two-tone/patterned, or null if unclear."),
  styleTags: z
    .array(z.string())
    .describe("1-4 short style descriptors, e.g. 'business-casual', 'athletic', 'vintage'."),
  useCaseTags: z
    .array(z.string())
    .describe("1-3 short use-case descriptors, e.g. 'work', 'weekend', 'formal-event'."),
});

export type WardrobeItemTags = z.infer<typeof TagSchema>;

const SYSTEM_PROMPT = `You tag clothing, shoe, and accessory items for a personal wardrobe app. Given an item's name and category (and a photo, if provided), determine its category, a natural display color name, which fixed color family that name belongs to (${COLOR_FAMILIES.join(", ")} - use "multi" for two-tone/patterned items), and short style and use-case tags. Base color on the photo when one is provided; otherwise make your best inference from the name.`;

async function requestTags(
  textContent: string,
  imageUrl: string | null
): Promise<WardrobeItemTags> {
  const content: Anthropic.Messages.ContentBlockParam[] = imageUrl
    ? [
        { type: "image", source: { type: "url", url: imageUrl } },
        { type: "text", text: textContent },
      ]
    : [{ type: "text", text: textContent }];

  const response = await getAnthropicClient().messages.parse({
    model: TAGGING_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    output_config: {
      format: zodOutputFormat(TagSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Wardrobe tag extraction response failed to parse against the expected schema");
  }

  return response.parsed_output;
}

export async function extractWardrobeItemTags(item: {
  itemName: string;
  category: string | null;
  imageUrl: string | null;
}): Promise<WardrobeItemTags> {
  const textContent = [
    `Item name: ${item.itemName}`,
    item.category ? `Known category: ${item.category}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  if (!item.imageUrl) {
    return requestTags(textContent, null);
  }

  try {
    return await requestTags(textContent, item.imageUrl);
  } catch (error) {
    // Some retailer image CDNs block Claude's URL fetch (e.g. via
    // robots.txt), which would otherwise leave the item permanently
    // untagged. Fall back to a text-only guess from the name/category
    // rather than failing the whole ingestion step for one blocked image.
    console.warn(
      `Vision tag extraction failed for image ${item.imageUrl}, falling back to text-only:`,
      error instanceof Error ? error.message : error
    );
    return requestTags(textContent, null);
  }
}
