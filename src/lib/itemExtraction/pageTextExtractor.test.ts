import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();

vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({ messages: { parse: parseMock } }),
}));

import { collectLargeImageCandidates, extractWithClaude, htmlToReadableText } from "./pageTextExtractor";

const PAGE = readFileSync(join(__dirname, "__fixtures__", "no-structured-data.html"), "utf8");
const URL_ = "https://www.fableandthread.example/products/pleated-midi-skirt";

describe("htmlToReadableText", () => {
  it("keeps the product heading, prices and description, one per line", () => {
    const text = htmlToReadableText(PAGE);

    expect(text).toContain("Pleated Midi Skirt");
    expect(text).toContain("$120.00 $84.00");
    expect(text).toContain("A fluid pleated skirt cut from recycled satin.");
  });

  it("drops scripts, styles, navigation and the footer", () => {
    const text = htmlToReadableText(PAGE);

    expect(text).not.toContain("dataLayer");
    expect(text).not.toContain("color: red");
    expect(text).not.toContain("Sale up to 60%");
    expect(text).not.toContain("Free shipping over $150");
  });

  it("caps long pages but keeps price lines found past the cut", () => {
    const filler = Array.from({ length: 1500 }, (_, i) => `<p>Filler paragraph number ${i} about fabric care</p>`).join("");
    const text = htmlToReadableText(`<main><h1>Long Page</h1>${filler}<p>Today only $59.00</p></main>`);

    expect(text.length).toBeLessThanOrEqual(12000);
    expect(text).toContain("Long Page");
    expect(text).toContain("Today only $59.00");
  });
});

describe("collectLargeImageCandidates", () => {
  it("offers the share image first, then lazy-loaded and srcset images, and skips logos and thumbnails", () => {
    const images = collectLargeImageCandidates(PAGE, URL_);

    expect(images[0]).toBe("https://static.fableandthread.example/skirt-hero.jpg");
    expect(images).toContain("https://static.fableandthread.example/skirt-side-1200.jpg");
    expect(images).not.toContain("https://static.fableandthread.example/skirt-side-400.jpg");
    expect(images.some((u) => u.includes("logo"))).toBe(false);
    expect(images.some((u) => u.includes("tiny"))).toBe(false);
    expect(new Set(images).size).toBe(images.length);
  });
});

describe("extractWithClaude", () => {
  afterEach(() => {
    parseMock.mockReset();
  });

  it("sends the readable text and a numbered image list, and maps the chosen image index to its address", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { itemName: "Pleated Midi Skirt", price: 84, currency: "cad", imageIndex: 2 },
    });

    const result = await extractWithClaude(PAGE, URL_);

    const call = parseMock.mock.calls[0][0];
    expect(call.model).toBeTruthy();
    expect(call.messages[0].content).toContain("Pleated Midi Skirt");
    expect(call.messages[0].content).toContain("1. https://static.fableandthread.example/skirt-hero.jpg");
    expect(call.messages[0].content).not.toContain("dataLayer");

    expect(result).toEqual({
      itemName: "Pleated Midi Skirt",
      price: 84,
      currency: "CAD",
      imageUrl: "https://static.fableandthread.example/skirt-side-1200.jpg",
    });
  });

  it("ignores an image index outside the list", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { itemName: "Pleated Midi Skirt", price: null, currency: null, imageIndex: 99 },
    });

    const result = await extractWithClaude(PAGE, URL_);

    expect(result?.imageUrl).toBeNull();
    expect(result?.price).toBeNull();
  });

  it("returns null when the model finds neither a name nor a price", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { itemName: null, price: null, currency: null, imageIndex: null },
    });

    expect(await extractWithClaude(PAGE, URL_)).toBeNull();
  });

  it("returns null (never throws) when the call fails", async () => {
    parseMock.mockRejectedValueOnce(new Error("model unavailable"));

    expect(await extractWithClaude(PAGE, URL_)).toBeNull();
  });
});
