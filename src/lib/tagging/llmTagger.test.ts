import { afterEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();

vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({ messages: { parse: parseMock } }),
}));

import { extractWardrobeItemTags } from "./llmTagger";

const FAKE_TAGS = {
  category: "outerwear",
  primaryColor: "navy",
  secondaryColor: null,
  styleTags: ["business-casual"],
  useCaseTags: ["work"],
};

describe("extractWardrobeItemTags", () => {
  afterEach(() => {
    parseMock.mockReset();
  });

  it("calls the vision path with the image when one is provided", async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: FAKE_TAGS });

    await extractWardrobeItemTags({
      itemName: "Navy Blazer",
      category: "outerwear",
      imageUrl: "https://cdn.retailer.com/blazer.jpg",
    });

    const call = parseMock.mock.calls[0][0];
    const content = call.messages[0].content;
    expect(content.some((block: { type: string }) => block.type === "image")).toBe(true);
  });

  it("falls back to a text-only call if the vision call fails (e.g. image blocked by robots.txt)", async () => {
    parseMock.mockRejectedValueOnce(new Error("This URL is disallowed by the website's robots.txt file."));
    parseMock.mockResolvedValueOnce({ parsed_output: FAKE_TAGS });

    const tags = await extractWardrobeItemTags({
      itemName: "Navy Blazer",
      category: "outerwear",
      imageUrl: "https://cdn.retailer.com/blazer.jpg",
    });

    expect(parseMock).toHaveBeenCalledTimes(2);
    const secondCallContent = parseMock.mock.calls[1][0].messages[0].content;
    expect(secondCallContent.some((block: { type: string }) => block.type === "image")).toBe(false);
    expect(tags).toEqual(FAKE_TAGS);
  });

  it("goes straight to text-only when there is no image at all", async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: FAKE_TAGS });

    await extractWardrobeItemTags({ itemName: "Wool Scarf", category: "accessories", imageUrl: null });

    expect(parseMock).toHaveBeenCalledTimes(1);
    const content = parseMock.mock.calls[0][0].messages[0].content;
    expect(content.some((block: { type: string }) => block.type === "image")).toBe(false);
  });
});
