import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ConnectGmailPage from "./page";

describe("ConnectGmailPage (consent step)", () => {
  it("discloses what is read and what is never done, before any Google redirect", () => {
    const html = renderToStaticMarkup(ConnectGmailPage());

    expect(html).toContain("order confirmations");
    expect(html).toContain("never send, delete, reply to, or change");
    expect(html).toContain("never share your data");
  });

  it("links to our own start route, not directly to Google", () => {
    const html = renderToStaticMarkup(ConnectGmailPage());

    expect(html).toContain('href="/api/auth/gmail/start"');
    expect(html).not.toContain("accounts.google.com");
  });

  it("says what the connection means without the filler phrase", () => {
    const html = renderToStaticMarkup(ConnectGmailPage());

    expect(html).toContain("Here is exactly what that means:");
    expect(html).not.toContain("in plain terms");
  });

  it("opens with a Welcome intro that can be skipped, in the server HTML so nothing flashes first", () => {
    const html = renderToStaticMarkup(ConnectGmailPage());

    expect(html).toContain('id="welcome-intro"');
    expect(html).toContain("Welcome");
    expect(html).toContain("Tap to skip");
    // The returning-visitor / reduced-motion gate runs before first paint.
    expect(html).toContain("pause:welcome-seen");
    expect(html).toContain("prefers-reduced-motion");
  });
});
