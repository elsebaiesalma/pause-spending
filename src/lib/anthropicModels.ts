// One model constant per feature that calls Claude. Each can be overridden
// with its own environment variable, without a code change.
//
// Before the single-model change (commit d3974a1) every feature below used
// claude-opus-5, which the live API accepts. Only outfits is new, and it
// runs on claude-sonnet-5-5.

function modelFromEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

// Still want it: outfit suggestions from owned pieces.
export const OUTFIT_MODEL = modelFromEnv("ANTHROPIC_MODEL_OUTFITS", "claude-sonnet-5-5");

// Wardrobe tagging and colour family, both run on wardrobe items.
export const TAGGING_MODEL = modelFromEnv("ANTHROPIC_MODEL_TAGGING", "claude-opus-5");

// Email receipt pipeline: deciding which emails are receipts, then extracting
// purchases from them.
export const RECEIPT_EXTRACTION_MODEL = modelFromEnv("ANTHROPIC_MODEL_RECEIPT_EXTRACTION", "claude-opus-5");

// Reading an item from an uploaded screenshot.
export const SCREENSHOT_MODEL = modelFromEnv("ANTHROPIC_MODEL_SCREENSHOT", "claude-opus-5");

// Pause-screen explanation of why an item overlaps with what you own.
export const REDUNDANCY_MODEL = modelFromEnv("ANTHROPIC_MODEL_REDUNDANCY", "claude-opus-5");

// Post-wait comparables, secondhand options and outfit ideas.
export const RECOMMENDATIONS_MODEL = modelFromEnv("ANTHROPIC_MODEL_RECOMMENDATIONS", "claude-opus-5");
