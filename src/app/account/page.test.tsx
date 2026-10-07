import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountPage from "./page";

describe("AccountPage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  async function render() {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    return { user, html: renderToStaticMarkup(await AccountPage()) };
  }

  it("shows the signed-in user's own email or name", async () => {
    const { user, html } = await render();
    expect(html).toContain(user.name ?? user.email);
  });

  it("has Gmail connection, Monthly plan, and the two coming-later placeholders", async () => {
    const { html } = await render();
    expect(html).toContain("Gmail connection");
    expect(html).toContain("Permanently delete my data");
    expect(html).toContain("Monthly plan");
    expect(html).toContain("Tone");
    expect(html).toContain("Auto-move timing");
    expect(html.match(/Coming later/g)).toHaveLength(2);
  });

  it("shows a clear reconnect prompt, not an error, when the Gmail connection has expired", async () => {
    const spy = vi.spyOn(prisma.emailConnection, "findUnique").mockResolvedValueOnce({ status: "expired" } as never);
    try {
      const { html } = await render();
      expect(html).toContain("expired");
      expect(html).toContain('href="/connect/gmail"');
      expect(html).toContain("Reconnect Gmail");
    } finally {
      spy.mockRestore();
    }
  });
});
