import { afterEach, describe, expect, it, vi } from "vitest";

describe("ANTHROPIC_MODEL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to claude-sonnet-5-5 when ANTHROPIC_MODEL is unset", async () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    const { ANTHROPIC_MODEL } = await import("./anthropicModel");
    expect(ANTHROPIC_MODEL).toBe("claude-sonnet-5-5");
  });

  it("uses the ANTHROPIC_MODEL override, trimmed", async () => {
    vi.stubEnv("ANTHROPIC_MODEL", "  claude-haiku-4-5-20251001  ");
    const { ANTHROPIC_MODEL } = await import("./anthropicModel");
    expect(ANTHROPIC_MODEL).toBe("claude-haiku-4-5-20251001");
  });
});
