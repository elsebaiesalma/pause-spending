import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsPage from "./page";

describe("SettingsPage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("shows the signed-in user's own email", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const element = await SettingsPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain(user.email);
  });
});
