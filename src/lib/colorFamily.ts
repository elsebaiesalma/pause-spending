import { ANTHROPIC_MODEL } from "@/lib/anthropicModel";
// The fixed set redundancy matching compares on. Kept as an app-validated
// String column (matching this codebase's existing convention for
// status/pauseStatus) rather than a Postgres native enum - see
// implementation/plan.md Step 2.
export const COLOR_FAMILIES = [
  "black",
  "navy",
  "grey",
  "cream",
  "brown",
  "red",
  "pink",
  "green",
  "blue",
  "purple",
  "yellow",
  "orange",
  "white",
  "multi",
  "metallic",
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export function isColorFamily(value: string): value is ColorFamily {
  return (COLOR_FAMILIES as readonly string[]).includes(value);
}

// Exact-match synonyms for common free-text color words -> colorFamily.
// Deliberately conservative: only names with one obvious family belong
// here. A brand-invented or ambiguous name (e.g. "Espresso", "Oatmeal") is
// left unmapped so the caller can route it to an LLM pass instead of
// guessing. Matching is case-insensitive on a trimmed, lowercased key.
export const COLOR_NAME_LOOKUP: Record<string, ColorFamily> = {
  black: "black",

  navy: "navy",
  "navy blue": "navy",

  grey: "grey",
  gray: "grey",
  charcoal: "grey",
  "dark grey": "grey",
  "dark gray": "grey",
  "light grey": "grey",
  "light gray": "grey",
  slate: "grey",

  cream: "cream",
  ivory: "cream",
  "off-white": "cream",
  "off white": "cream",
  beige: "cream",
  "antique white": "cream",
  tan: "cream",
  nude: "cream",
  ecru: "cream",
  vanilla: "cream",

  brown: "brown",
  chocolate: "brown",
  tobacco: "brown",
  camel: "brown",
  cognac: "brown",
  "dark brown": "brown",
  chestnut: "brown",
  mocha: "brown",
  espresso: "brown",
  coffee: "brown",
  taupe: "brown",

  red: "red",
  "dark red": "red",
  burgundy: "red",
  maroon: "red",
  crimson: "red",
  scarlet: "red",
  wine: "red",
  cherry: "red",
  brick: "red",

  pink: "pink",
  blush: "pink",
  rose: "pink",
  fuchsia: "pink",
  magenta: "pink",
  "hot pink": "pink",
  coral: "pink",
  salmon: "pink",

  green: "green",
  olive: "green",
  "olive green": "green",
  sage: "green",
  emerald: "green",
  "forest green": "green",
  mint: "green",
  khaki: "green",
  hunter: "green",

  blue: "blue",
  "sky blue": "blue",
  cobalt: "blue",
  teal: "blue",
  turquoise: "blue",
  denim: "blue",
  cerulean: "blue",
  periwinkle: "blue",

  purple: "purple",
  lavender: "purple",
  lilac: "purple",
  plum: "purple",
  mauve: "purple",
  violet: "purple",
  eggplant: "purple",

  yellow: "yellow",
  "butter yellow": "yellow",
  "pale yellow": "yellow",
  mustard: "yellow",
  lemon: "yellow",
  buttercup: "yellow",

  orange: "orange",
  rust: "orange",
  "burnt orange": "orange",
  peach: "orange",
  apricot: "orange",
  terracotta: "orange",

  white: "white",
  "pure white": "white",
  "bright white": "white",
  snow: "white",

  metallic: "metallic",
  gold: "metallic",
  silver: "metallic",
  bronze: "metallic",
  champagne: "metallic",
  "rose gold": "metallic",
  pewter: "metallic",
  platinum: "metallic",
  gunmetal: "metallic",

  multi: "multi",
  multicolor: "multi",
  multicolour: "multi",
  "multi-color": "multi",
  "multi-colour": "multi",
  print: "multi",
  pattern: "multi",
  patterned: "multi",
  floral: "multi",
  striped: "multi",
  plaid: "multi",
  tie_dye: "multi",
};

export function lookupColorFamily(freeText: string | null | undefined): ColorFamily | null {
  if (!freeText) return null;
  const key = freeText.trim().toLowerCase();
  return COLOR_NAME_LOOKUP[key] ?? null;
}

// LLM fallback for a free-text color name the static lookup doesn't cover
// (brand-invented names like "Espresso", "Oatmeal"). Only called when
// lookupColorFamily() returns null - never used to override a lookup hit.
export async function classifyColorFamilyByLLM(colorName: string): Promise<ColorFamily | null> {
  const { z } = await import("zod");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const { getAnthropicClient } = await import("@/lib/anthropicClient");

  const Schema = z.object({
    colorFamily: z
      .enum(COLOR_FAMILIES)
      .nullable()
      .describe("The closest matching color family, or null if genuinely indeterminate."),
  });

  const response = await getAnthropicClient().messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 256,
    system: `You classify a free-text clothing color name (e.g. "Espresso", "Oatmeal", "Dusty Rose") into exactly one of these fixed color families: ${COLOR_FAMILIES.join(", ")}. A two-tone or patterned description maps to "multi". Pick the single closest family - never invent a new one.`,
    messages: [{ role: "user", content: `Color name: ${colorName}` }],
    output_config: { format: zodOutputFormat(Schema) },
  });

  if (!response.parsed_output) {
    throw new Error(`Color family classification failed to parse for "${colorName}"`);
  }

  return response.parsed_output.colorFamily;
}
