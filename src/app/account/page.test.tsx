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
    vi.unstubAllEnvs();
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

  it("has Gmail connection, Budget & Goals, and the two coming-later placeholders", async () => {
    vi.stubEnv("GMAIL_ENABLED", "true");
    const { html } = await render();
    expect(html).toContain("Gmail connection");
    expect(html).toContain("Permanently delete my data");
    expect(html).toContain("Budget &amp; Goals");
    expect(html).toContain("Tone");
    expect(html).toContain("Auto-move timing");
    expect(html.match(/Coming later/g)).toHaveLength(2);
  });

  it("shows a clear reconnect prompt, not an error, when the Gmail connection has expired", async () => {
    vi.stubEnv("GMAIL_ENABLED", "true");
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

  it("hides the Gmail section while Gmail is parked, and keeps the monthly plan", async () => {
    const { html } = await render();
    expect(html).not.toContain("Gmail connection");
    expect(html).not.toContain('href="/connect/gmail"');
    expect(html).toContain("Budget &amp; Goals");
  });

  it("tells a demo visitor what signing out means, instead of showing a throwaway email", async () => {
    const spy = vi
      .spyOn(prisma.user, "findUniqueOrThrow")
      .mockResolvedValueOnce({ email: "guest-1a2b3c4d@demo.pause.test", name: "Guest" } as never);
    try {
      const { html } = await render();
      expect(html).toContain("demo account");
      expect(html).not.toContain("demo.pause.test");
    } finally {
      spy.mockRestore();
    }
  });
});
