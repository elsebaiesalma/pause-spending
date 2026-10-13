import { afterEach, describe, expect, it, vi } from "vitest";

describe("per-feature model constants", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("outfits default to claude-sonnet-5-5", async () => {
    vi.stubEnv("ANTHROPIC_MODEL_OUTFITS", "");
    const { OUTFIT_MODEL } = await import("./anthropicModels");
    expect(OUTFIT_MODEL).toBe("claude-sonnet-5-5");
  });

  it("every other feature defaults to the model it used before the single-model change", async () => {
    const { TAGGING_MODEL, RECEIPT_EXTRACTION_MODEL, SCREENSHOT_MODEL, REDUNDANCY_MODEL } =
      await import("./anthropicModels");
    for (const model of [TAGGING_MODEL, RECEIPT_EXTRACTION_MODEL, SCREENSHOT_MODEL, REDUNDANCY_MODEL]) {
      expect(model).toBe("claude-opus-5");
    }
  });

  it("each feature reads its own environment variable, trimmed", async () => {
    vi.stubEnv("ANTHROPIC_MODEL_TAGGING", "  claude-haiku-4-5-20251001 ");
    vi.stubEnv("ANTHROPIC_MODEL_OUTFITS", "claude-opus-5-5");
    const { TAGGING_MODEL, OUTFIT_MODEL, SCREENSHOT_MODEL } = await import("./anthropicModels");
    expect(TAGGING_MODEL).toBe("claude-haiku-4-5-20251001");
    expect(OUTFIT_MODEL).toBe("claude-opus-5-5");
    expect(SCREENSHOT_MODEL).toBe("claude-opus-5");
  });
});
