import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./fonts", () => ({
  clashDisplay: { variable: "mock-font-clash" },
}));

import Home from "./page";

describe("Home (landing page)", () => {
  it("renders without needing a database - this is a static marketing page, not the dashboard", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).toContain("PAUSE lines up what you want with the pieces you already have");
    expect(html).not.toMatch(/CALIB/i);
  });

  it("opens with the new eyebrow, not the old edition line", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).toContain("For the moment before checkout");
    expect(html).not.toContain("Architectural Stillness");
  });

  it("states each real statistic with its source, and no invented figures", () => {
    const html = renderToStaticMarkup(Home());
    const stats: [string, string][] = [
      ["60% of Gen Z social media users have impulse-bought something they saw on social", "Bankrate/YouGov, 2023"],
      ["Only 9% of Gen Z say their social media purchases are planned", "GoDaddy, 2024"],
      ["62% of Gen Z BNPL users regret a BNPL purchase", "LendingTree"],
      ["A ~25-hour wait lowered both the urge to buy and purchase intent", "Moser, U. Michigan, 2020"],
    ];
    for (const [claim, source] of stats) {
      expect(html).toContain(claim);
      expect(html).toContain(source);
    }
    expect(html).not.toMatch(/Illustrative figure|82.4|4,850|99.4/);
  });

  it("shows the product in the hero with built-in art: no stock photos and no image files to go missing", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).not.toContain("picsum.photos");
    expect(html).not.toContain("/images/");
    expect(html).toContain("Example of a PAUSE screen");
    expect(html).toContain("Before you buy it, see what you already own.");
  });

  it("makes no wear or cost-per-wear claims, because there is no wear data", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).not.toMatch(/per wear|documented wears|\/ wear/i);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("points every real CTA at the actual Gmail connect flow when Gmail is enabled, not a fake signup", () => {
    vi.stubEnv("GMAIL_ENABLED", "true");
    const html = renderToStaticMarkup(Home());

    expect(html).toContain('href="/connect/gmail"');
    expect(html).not.toContain("mailto:");
  });

  it("points the CTAs at the demo while Gmail is parked, with no dead Gmail links", () => {
    const html = renderToStaticMarkup(Home());

    expect(html).toContain('action="/api/demo"');
    expect(html).not.toContain('href="/connect/gmail"');
    expect(html).not.toContain("mailto:");
  });

  it("mentions Gmail sync only when Gmail is enabled, and never fictional IMAP/OCR/browser-extension claims", () => {
    const parked = renderToStaticMarkup(Home());
    expect(parked).not.toContain("Gmail");
    expect(parked).not.toMatch(/IMAP|OCR|browser extension/i);

    vi.stubEnv("GMAIL_ENABLED", "true");
    const enabled = renderToStaticMarkup(Home());
    expect(enabled).toContain("Gmail");
    expect(enabled).not.toMatch(/IMAP|OCR|browser extension/i);
  });

  it("tells the 25-hour finding as the urge chart, with its source and the 24-hour default", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).toContain("The urge is loud. Then it fades.");
    expect(html).toContain("An illustration of the finding, not plotted data");
    expect(html).toContain("Pause for 24 hours");
    expect(html).not.toContain("A day is long enough");
    expect(html).toContain("A few minutes of reflection helps too");
    expect(html).toContain("Guilt doesn&#x27;t work, and people don&#x27;t want it");
  });

  it("shows the receipt band as a labelled example, with sums that match and the call to action", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).toContain("It adds up quietly.");
    expect(html).toContain("An example, not real data");
    expect(html).toContain("$292.00");
    expect(html).toContain("$223.00");
    expect(html).toContain("$69.00");
    expect(html).toContain('id="hero-heading"');
    expect(html.indexOf("It adds up quietly.")).toBeLessThan(html.indexOf("Before you buy it, see what you already own."));
    expect(html).toContain("Frequently asked questions");
    expect(html).not.toContain("Good to know");
  });
});
