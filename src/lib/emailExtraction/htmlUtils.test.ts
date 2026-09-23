import { describe, expect, it } from "vitest";
import { cleanHtmlForExtraction, extractProductImageUrl } from "./htmlUtils";

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
});
