import { describe, expect, it } from "vitest";
import { cleanHtmlForExtraction, extractProductImageAndLink, extractProductImageUrl } from "./htmlUtils";

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

describe("extractProductImageUrl", () => {
  it("returns the first plausible product image", () => {
    const html = `<img src="https://cdn.retailer.com/products/navy-blazer.jpg" width="400">`;
    expect(extractProductImageUrl(html)).toBe(
      "https://cdn.retailer.com/products/navy-blazer.jpg"
    );
  });

  it("skips tracking pixels and logos, returning the real product image", () => {
    const html = `
      <img src="https://mail.retailer.com/open.gif" width="1" height="1">
      <img src="https://cdn.retailer.com/assets/logo.png">
      <img src="https://cdn.retailer.com/products/navy-blazer.jpg">
    `;
    expect(extractProductImageUrl(html)).toBe(
      "https://cdn.retailer.com/products/navy-blazer.jpg"
    );
  });

  it("returns undefined when no plausible product image exists", () => {
    const html = `<img src="https://mail.retailer.com/pixel-track.gif">`;
    expect(extractProductImageUrl(html)).toBeUndefined();
  });

  it("returns undefined for an email with no images", () => {
    expect(extractProductImageUrl("<p>No images here</p>")).toBeUndefined();
  });

  it("skips a shared header/banner image even when its filename doesn't say 'logo'", () => {
    // The exact real-world shape that slipped through the old filter:
    // a shared rebrand banner reused across every email from a retailer.
    const html = `
      <img src="https://is4.revolveassets.com/images/up/2025/November/Remail_2025Rebrand_Header.png">
      <img src="https://cdn.retailer.com/products/navy-blazer.jpg">
    `;
    expect(extractProductImageUrl(html)).toBe("https://cdn.retailer.com/products/navy-blazer.jpg");
  });
});

describe("extractProductImageAndLink", () => {
  it("prefers an image wrapped in a link to the specific product page, returning both fields", () => {
    const html = `
      <a href="https://mail.retailer.com/view-in-browser"><img src="https://cdn.retailer.com/assets/header.png"></a>
      <a href="https://retailer.com/products/navy-wool-blazer"><img src="https://cdn.retailer.com/products/navy-blazer.jpg"></a>
    `;
    expect(extractProductImageAndLink(html)).toEqual({
      imageUrl: "https://cdn.retailer.com/products/navy-blazer.jpg",
      productLink: "https://retailer.com/products/navy-wool-blazer",
    });
  });

  it("ignores an anchor pointing at unsubscribe/account/etc. even if it wraps a plausible image", () => {
    const html = `<a href="https://retailer.com/unsubscribe?id=123"><img src="https://cdn.retailer.com/products/navy-blazer.jpg"></a>`;
    const result = extractProductImageAndLink(html);
    expect(result.productLink).toBeUndefined();
  });

  it("falls back to a bare (unlinked) product image with no productLink when no product-page anchor exists", () => {
    const html = `<img src="https://cdn.retailer.com/products/navy-blazer.jpg">`;
    expect(extractProductImageAndLink(html)).toEqual({
      imageUrl: "https://cdn.retailer.com/products/navy-blazer.jpg",
      productLink: undefined,
    });
  });
});
