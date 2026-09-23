import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./llmFilter", () => ({
  classifyEmailByLLM: vi.fn(),
}));

import { classifyEmailByLLM } from "./llmFilter";
import { classifyEmail } from "./classifyEmail";

const AMBIGUOUS_EMAIL = {
  from: "orders@target.com",
  subject: "Your Target order confirmation",
};

describe("classifyEmail", () => {
  afterEach(() => {
    vi.mocked(classifyEmailByLLM).mockReset();
  });

  it("resolves a confidently in-scope email via rules alone, never calling the LLM", async () => {
    const result = await classifyEmail({
      from: "orders@nike.com",
      subject: "Your Nike Order Confirmation",
    });

    expect(result).toBe("in_scope");
    expect(classifyEmailByLLM).not.toHaveBeenCalled();
  });

  it("resolves a confidently out-of-scope email via rules alone, never calling the LLM", async () => {
    const result = await classifyEmail({
      from: "info@netflix.com",
      subject: "Your Netflix bill is ready",
    });

    expect(result).toBe("out_of_scope");
    expect(classifyEmailByLLM).not.toHaveBeenCalled();
  });

  it("routes an ambiguous email to the LLM and returns in_scope on a high-confidence yes", async () => {
    vi.mocked(classifyEmailByLLM).mockResolvedValueOnce({
      in_scope: true,
      confidence: "high",
    });

    const result = await classifyEmail(AMBIGUOUS_EMAIL);

    expect(result).toBe("in_scope");
    expect(classifyEmailByLLM).toHaveBeenCalledTimes(1);
    expect(classifyEmailByLLM).toHaveBeenCalledWith(AMBIGUOUS_EMAIL);
  });

  it("routes an ambiguous email to the LLM and returns out_of_scope on a medium-confidence no", async () => {
    vi.mocked(classifyEmailByLLM).mockResolvedValueOnce({
      in_scope: false,
      confidence: "medium",
    });

    const result = await classifyEmail(AMBIGUOUS_EMAIL);

    expect(result).toBe("out_of_scope");
  });

  it("routes a low-confidence LLM result to needs_review rather than auto-deciding either way", async () => {
    vi.mocked(classifyEmailByLLM).mockResolvedValueOnce({
      in_scope: true,
      confidence: "low",
    });

    const result = await classifyEmail(AMBIGUOUS_EMAIL);

    expect(result).toBe("needs_review");
  });
});
