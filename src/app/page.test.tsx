import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./fonts", () => ({
  clashDisplay: { variable: "mock-font-clash" },
}));

import Home from "./page";

describe("Home (landing page)", () => {
  it("renders without needing a database - this is a static marketing page, not the dashboard", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).toContain("PA<em>U</em>SE");
    expect(html).not.toMatch(/CALIB/i);
  });

  it("opens with the new eyebrow, not the old edition line", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).toContain("FOR THE MOMENT BEFORE CHECKOUT");
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

  it("uses neutral image slots instead of hotlinked stock photos, including a pause screen screenshot slot", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).not.toContain("picsum.photos");
    expect(html).toContain("/images/hero.jpg");
    expect(html).toContain("/images/pause-screen.jpg");
    expect(html).toContain("/images/sample-1.jpg");
    expect(html).toContain("/images/sample-2.jpg");
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

  it("describes the real sync mechanism (Gmail), not fictional IMAP/OCR/browser-extension claims", () => {
    const html = renderToStaticMarkup(Home());

    expect(html).toContain("Gmail");
    expect(html).not.toMatch(/IMAP|OCR|browser extension/i);
  });
});
