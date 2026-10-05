import { SCREENSHOT_MODEL } from "@/lib/anthropicModels";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "@/lib/anthropicClient";

const ScreenshotExtractionSchema = z.object({
  itemName: z
    .string()
    .nullable()
    .describe("The name of the single main product shown, or null if none can be identified."),
  price: z
    .number()
    .nullable()
    .describe(
      "The current/sale price shown, preferring a discounted price over a struck-through original price. Null if no price is visible."
    ),
  currency: z
    .string()
    .nullable()
    .describe("The currency code or symbol shown, e.g. 'USD' or '$'. Null if unclear."),
  imageDescription: z
    .string()
    .describe("A brief visual description of the main product, for reference."),
});

export type ScreenshotExtraction = z.infer<typeof ScreenshotExtractionSchema>;

const SYSTEM_PROMPT = `You identify the single main product a user is considering buying from a screenshot (e.g. of a shopping site or app). Isolate just the one main product being showcased - ignore unrelated items like "you may also like" carousels. If a discounted/sale price is shown alongside a struck-through original price, report the discounted price. If you cannot confidently identify a specific product, set itemName to null.`;

// Runs the screenshot through a vision LLM call with a forced schema.
// Returns null if the model can't identify anything (or the call itself
// fails, e.g. an unparseable image) so the caller can fall back to a
// blank manual-entry form rather than blocking, per the design's error
// handling.
export async function extractFromScreenshot(
  base64Image: string,
  mimeType: string
): Promise<ScreenshotExtraction | null> {
  try {
    const response = await getAnthropicClient().messages.parse({
      model: SCREENSHOT_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Image,
              },
            },
            { type: "text", text: "Identify the single main product being shown for purchase." },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(ScreenshotExtractionSchema),
      },
    });

    if (!response.parsed_output || !response.parsed_output.itemName) {
      return null;
    }

    return response.parsed_output;
  } catch (error) {
    console.warn("Screenshot extraction failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
