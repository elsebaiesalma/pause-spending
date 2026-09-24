import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./fonts", () => ({
  clashDisplay: { variable: "mock-font-clash" },
}));

import Home from "./page";

describe("Home (landing page)", () => {
  it("renders without needing a database - this is a static marketing page, not the dashboard", () => {
    const html = renderToStaticMarkup(Home());
    expect(html).toContain("CALIB");
  });

  it("points every real CTA at the actual Gmail connect flow, not a fake signup", () => {
    const html = renderToStaticMarkup(Home());

    expect(html).toContain('href="/connect/gmail"');
    expect(html).not.toContain("mailto:");
  });

  it("describes the real sync mechanism (Gmail), not fictional IMAP/OCR/browser-extension claims", () => {
    const html = renderToStaticMarkup(Home());

    expect(html).toContain("Gmail");
    expect(html).not.toMatch(/IMAP|OCR|browser extension/i);
  });
});
