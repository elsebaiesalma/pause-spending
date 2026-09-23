import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/waitQueue", () => ({
  listWaitingQueue: vi.fn().mockResolvedValue({ elapsed: [], stillWaiting: [] }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    emailConnection: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import Home from "./page";

describe("Home", () => {
  it("shows a clear reconnect prompt, not an error, when the Gmail connection has expired", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ id: "u1" } as never);
    vi.mocked(prisma.emailConnection.findUnique).mockResolvedValueOnce({
      status: "expired",
    } as never);

    const element = await Home();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("expired");
    expect(html).toContain('href="/connect/gmail"');
  });
});
