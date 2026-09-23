import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ConnectGmailPage from "./page";

describe("ConnectGmailPage (consent step)", () => {
  it("discloses what is read and what is never done, before any Google redirect", () => {
    const html = renderToStaticMarkup(ConnectGmailPage());

    expect(html).toContain("order-confirmation emails");
    expect(html).toContain("never send, delete, or modify");
    expect(html).toContain("never share your data");
  });

  it("links to our own start route, not directly to Google", () => {
    const html = renderToStaticMarkup(ConnectGmailPage());

    expect(html).toContain('href="/api/auth/gmail/start"');
    expect(html).not.toContain("accounts.google.com");
  });
});
