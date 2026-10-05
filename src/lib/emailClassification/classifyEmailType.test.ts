import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./emailTypeLlmFilter", () => ({
  classifyEmailTypeByLLM: vi.fn(),
}));

import { classifyEmailTypeByLLM } from "./emailTypeLlmFilter";
import { classifyEmailType } from "./classifyEmailType";

const AMBIGUOUS_EMAIL = { subject: "SALMA, here's an update" };

describe("classifyEmailType", () => {
  afterEach(() => {
    vi.mocked(classifyEmailTypeByLLM).mockReset();
  });

  it("resolves a confidently-ruled subject without calling the LLM", async () => {
    const result = await classifyEmailType({ subject: "Order Confirmation" });
    expect(result).toBe("order_confirmation");
    expect(classifyEmailTypeByLLM).not.toHaveBeenCalled();
  });

  it("routes an ambiguous subject to the LLM and returns its high-confidence type", async () => {
    vi.mocked(classifyEmailTypeByLLM).mockResolvedValueOnce({
      type: "order_confirmation",
      confidence: "high",
    });

    const result = await classifyEmailType(AMBIGUOUS_EMAIL);
    expect(result).toBe("order_confirmation");
    expect(classifyEmailTypeByLLM).toHaveBeenCalledWith(AMBIGUOUS_EMAIL);
  });

  it("treats a low-confidence LLM result as 'other' rather than risking a wrong order_confirmation call", async () => {
    vi.mocked(classifyEmailTypeByLLM).mockResolvedValueOnce({
      type: "order_confirmation",
      confidence: "low",
    });

    const result = await classifyEmailType(AMBIGUOUS_EMAIL);
    expect(result).toBe("other");
  });
});
