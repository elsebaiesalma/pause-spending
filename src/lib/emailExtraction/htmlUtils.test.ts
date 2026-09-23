import { describe, expect, it } from "vitest";
import { cleanHtmlForExtraction, extractImageCandidates } from "./htmlUtils";

describe("cleanHtmlForExtraction", () => {
  it("strips style and script blocks and collapses whitespace", () => {
    const html = `
      <html>
        <style>.a { color: red; }</style>
        <script>console.log("x")</script>
        <body>  Hello   <b>world</b>  </body>
      </html>
    `;

    const cleaned = cleanHtmlForExtraction(html);

    expect(cleaned).not.toContain("color: red");
    expect(cleaned).not.toContain("console.log");
    expect(cleaned).toContain("Hello <b>world</b>");
  });

  it("truncates very long input", () => {
    const html = "a".repeat(20000);
    expect(cleanHtmlForExtraction(html).length).toBeLessThanOrEqual(15000);
  });
});

describe("extractImageCandidates", () => {
  it("lists a plausible product image, skipping tracking pixels", () => {
    const html = `
      <img src="https://mail.retailer.com/open.gif" width="1" height="1">
      <img src="https://cdn.retailer.com/products/navy-blazer.jpg">
    `;
    expect(extractImageCandidates(html)).toEqual([
      { imageUrl: "https://cdn.retailer.com/products/navy-blazer.jpg" },
    ]);
  });

  it("skips a shared header/banner image even when its filename doesn't say 'logo'", () => {
    // The exact real-world shape that slipped through the old filter:
    // a shared rebrand banner reused across every email from a retailer.
    const html = `
      <img src="https://is4.revolveassets.com/images/up/2025/November/Remail_2025Rebrand_Header.png">
      <img src="https://cdn.retailer.com/products/navy-blazer.jpg">
    `;
    const candidates = extractImageCandidates(html);
    expect(candidates.map((c) => c.imageUrl)).toEqual(["https://cdn.retailer.com/products/navy-blazer.jpg"]);
  });

  it("returns an empty list when no plausible product image exists", () => {
    expect(extractImageCandidates(`<img src="https://mail.retailer.com/pixel-track.gif">`)).toEqual([]);
    expect(extractImageCandidates("<p>No images here</p>")).toEqual([]);
  });

  it("lists an image wrapped in a link to its product page first, with the link attached", () => {
    const html = `
      <a href="https://mail.retailer.com/view-in-browser"><img src="https://cdn.retailer.com/assets/header.png"></a>
      <a href="https://retailer.com/products/navy-wool-blazer"><img src="https://cdn.retailer.com/products/navy-blazer.jpg"></a>
    `;
    expect(extractImageCandidates(html)).toEqual([
      { imageUrl: "https://cdn.retailer.com/products/navy-blazer.jpg", productLink: "https://retailer.com/products/navy-wool-blazer" },
    ]);
  });

  it("ignores an anchor pointing at unsubscribe/account/etc. even if it wraps a plausible image, falling back to it as a bare candidate", () => {
    const html = `<a href="https://retailer.com/unsubscribe?id=123"><img src="https://cdn.retailer.com/products/navy-blazer.jpg"></a>`;
    expect(extractImageCandidates(html)).toEqual([
      { imageUrl: "https://cdn.retailer.com/products/navy-blazer.jpg" },
    ]);
  });

  it("lists every item's photo in a multi-item order, each paired with its own product link", () => {
    const html = `
      <a href="https://retailer.com/products/navy-blazer"><img src="https://cdn.retailer.com/products/blazer.jpg"></a>
      <a href="https://retailer.com/products/silk-scarf"><img src="https://cdn.retailer.com/products/scarf.jpg"></a>
    `;
    expect(extractImageCandidates(html)).toEqual([
      { imageUrl: "https://cdn.retailer.com/products/blazer.jpg", productLink: "https://retailer.com/products/navy-blazer" },
      { imageUrl: "https://cdn.retailer.com/products/scarf.jpg", productLink: "https://retailer.com/products/silk-scarf" },
    ]);
  });

  it("never lists the same image URL twice", () => {
    const html = `
      <a href="https://retailer.com/products/navy-blazer"><img src="https://cdn.retailer.com/products/blazer.jpg"></a>
      <img src="https://cdn.retailer.com/products/blazer.jpg">
    `;
    expect(extractImageCandidates(html)).toHaveLength(1);
  });
});
