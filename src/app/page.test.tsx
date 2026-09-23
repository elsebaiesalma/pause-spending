import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/waitQueue", () => ({
  listWaitingQueue: vi.fn().mockResolvedValue({ elapsed: [], stillWaiting: [] }),
}));

vi.mock("@/lib/wardrobe", () => ({
  listActiveWardrobeItems: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/budget", () => ({
  currentMonthKey: vi.fn().mockReturnValue("2026-09"),
  getBudgetForMonth: vi.fn().mockResolvedValue(null),
  getMonthSpend: vi.fn().mockResolvedValue(0),
}));

vi.mock("./fonts", () => ({
  clashDisplay: { variable: "mock-font-clash" },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    emailConnection: { findUnique: vi.fn() },
    desiredItem: { findMany: vi.fn().mockResolvedValue([]) },
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

  it("shows real computed stats, not placeholder numbers", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ id: "u1" } as never);
    vi.mocked(prisma.emailConnection.findUnique).mockResolvedValueOnce(null);
    const { listActiveWardrobeItems } = await import("@/lib/wardrobe");
    vi.mocked(listActiveWardrobeItems).mockResolvedValueOnce(
      Array.from({ length: 7 }, (_, i) => ({ id: String(i) })) as never
    );
    vi.mocked(prisma.desiredItem.findMany).mockResolvedValueOnce([
      { price: "50.00" },
      { price: "20.00" },
    ] as never);

    const element = await Home();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("7");
    expect(html).toContain("$70.00");
    expect(html).toContain("Connect Gmail");
  });

  it("links to the real app routes, not placeholder anchors", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

    const element = await Home();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('href="/purchases"');
    expect(html).toContain('href="/wardrobe"');
    expect(html).toContain('href="/budget"');
    expect(html).toContain('href="/wishlist"');
    expect(html).toContain('href="/desired-items/new"');
  });
});
