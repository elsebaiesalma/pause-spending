import { afterEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();

vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({ messages: { parse: parseMock } }),
}));

import { extractFromScreenshot } from "./screenshotExtractor";

describe("extractFromScreenshot", () => {
  afterEach(() => {
    parseMock.mockReset();
  });

  it("returns the identified item when the model finds one", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        itemName: "Navy Wool Blazer",
        price: 189.99,
        currency: "USD",
        imageDescription: "A navy blazer on a hanger",
      },
    });

    const result = await extractFromScreenshot("base64data", "image/png");

    expect(result?.itemName).toBe("Navy Wool Blazer");
    expect(result?.price).toBe(189.99);
  });

  it("returns null (never blocks) when the model can't identify a product", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { itemName: null, price: null, currency: null, imageDescription: "unclear" },
    });

    const result = await extractFromScreenshot("base64data", "image/png");

    expect(result).toBeNull();
  });

  it("returns null (never blocks) when the API call itself fails, e.g. an unparseable image", async () => {
    parseMock.mockRejectedValueOnce(new Error("could not decode image"));

    const result = await extractFromScreenshot("not-a-real-image", "image/png");

    expect(result).toBeNull();
  });
});
