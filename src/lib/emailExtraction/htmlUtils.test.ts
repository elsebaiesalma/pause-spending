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
    const html = "a".repeat(50000);
    expect(cleanHtmlForExtraction(html).length).toBeLessThanOrEqual(40000);
  });

  it("keeps a table row's item, qty, and price on lines close together instead of one flattened line", () => {
    const html = `
      <table><tr><td>Wool Coat</td><td>Qty: 1</td><td>$199.00</td></tr>
      <tr><td>Silk Scarf</td><td>Qty: 2</td><td>$39.00</td></tr></table>
    `;

    const cleaned = cleanHtmlForExtraction(html);
    const lines = cleaned.split("\n").map((l) => l.trim());

    // Each cell lands on its own line, so "Wool Coat" and its own price
    // are never on the same flattened line as "Silk Scarf" and its price.
    const coatLineIndex = lines.findIndex((l) => l.includes("Wool Coat"));
    const scarfLineIndex = lines.findIndex((l) => l.includes("Silk Scarf"));
    expect(lines[coatLineIndex]).not.toContain("$39.00");
    expect(lines[scarfLineIndex]).not.toContain("$199.00");
    // The coat's own price line falls between the coat's row and the
    // scarf's row starting - never after the scarf's row has begun.
    const coatPriceLineIndex = lines.findIndex((l) => l.includes("$199.00"));
    expect(coatPriceLineIndex).toBeGreaterThan(coatLineIndex);
    expect(coatPriceLineIndex).toBeLessThan(scarfLineIndex);
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

  // Real gaps found diagnosing an actual synced mailbox: none of these had
  // a telling filename, so the old filename-only filter let them through.

  it("skips a spacer/divider gif by its dimensions even when its filename gives no hint (real example: 'trans.gif')", () => {
    const html = `
      <img src="https://parcel-cdn.delivery.hm.com/img/mail/hm/trans.gif" width="1" height="100%">
      <img src="https://cdn.retailer.com/products/navy-blazer.jpg">
    `;
    expect(extractImageCandidates(html).map((c) => c.imageUrl)).toEqual([
      "https://cdn.retailer.com/products/navy-blazer.jpg",
    ]);
  });

  it("skips a social-platform icon by its alt text even when its filename doesn't say 'social' or 'icon'", () => {
    const html = `
      <img src="https://cdn.retailer.com/vce/Instagram_dmo.png" alt="Instagram" width="24">
      <img src="https://cdn.retailer.com/products/navy-blazer.jpg">
    `;
    expect(extractImageCandidates(html).map((c) => c.imageUrl)).toEqual([
      "https://cdn.retailer.com/products/navy-blazer.jpg",
    ]);
  });

  it("skips a bare department-nav banner by its alt text (real example: H&M's 'Women'/'Men'/'Kids' footer banners)", () => {
    const html = `
      <img src="https://cdn.retailer.com/img/mail/hm/WOMEN_AW25_400x400px.jpg" alt="Women">
      <img src="https://cdn.retailer.com/products/navy-blazer.jpg">
    `;
    expect(extractImageCandidates(html).map((c) => c.imageUrl)).toEqual([
      "https://cdn.retailer.com/products/navy-blazer.jpg",
    ]);
  });

  it("skips an image whose alt text says 'logo' even when the filename doesn't", () => {
    const html = `
      <img src="https://cdn.retailer.com/assets/wordmark.png" alt="Retailer logo">
      <img src="https://cdn.retailer.com/products/navy-blazer.jpg">
    `;
    expect(extractImageCandidates(html).map((c) => c.imageUrl)).toEqual([
      "https://cdn.retailer.com/products/navy-blazer.jpg",
    ]);
  });
});
