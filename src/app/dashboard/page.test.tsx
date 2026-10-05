import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/waitQueue", () => ({
  listWaitingQueue: vi.fn().mockResolvedValue({ elapsed: [], stillWaiting: [] }),
}));

vi.mock("@/lib/budget", () => ({
  currentMonthKey: vi.fn().mockReturnValue("2026-09"),
  getBudgetForMonth: vi.fn().mockResolvedValue(null),
  getMonthSpend: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/dashboard/kept", () => ({
  getKeptSummary: vi.fn().mockResolvedValue({ totalKept: 0, itemsLetGo: 0 }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailConnection: { findUnique: vi.fn().mockResolvedValue(null) },
    desiredItem: { count: vi.fn().mockResolvedValue(0) },
    purchase: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { listWaitingQueue } from "@/lib/waitQueue";
import { getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { getKeptSummary } from "@/lib/dashboard/kept";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(listWaitingQueue).mockResolvedValue({ elapsed: [], stillWaiting: [] });
    vi.mocked(getBudgetForMonth).mockResolvedValue(null);
    vi.mocked(getMonthSpend).mockResolvedValue(0);
    vi.mocked(getKeptSummary).mockResolvedValue({ totalKept: 0, itemsLetGo: 0 });
    vi.mocked(prisma.emailConnection.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.desiredItem.count).mockResolvedValue(0);
    vi.mocked(prisma.purchase.count).mockResolvedValue(0);
    vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);
  });

  async function render() {
    const element = await DashboardPage();
    return renderToStaticMarkup(element);
  }

  it("redirects to /login instead of rendering when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    await expect(DashboardPage()).rejects.toThrow();
  });

  it("shows a clear reconnect prompt, not an error, when the Gmail connection has expired", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(prisma.emailConnection.findUnique).mockResolvedValueOnce({ status: "expired" } as never);

    const html = await render();

    expect(html).toContain("expired");
    expect(html).toContain('href="/connect/gmail"');
  });

  describe("Kept top band", () => {
    it("invites a first pause when nothing has ever been sent through the flow", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
      vi.mocked(prisma.desiredItem.count).mockResolvedValueOnce(0); // total
      vi.mocked(prisma.desiredItem.count).mockResolvedValueOnce(0); // released

      const html = await render();

      expect(html).toContain("Pause your first item");
      expect(html).toContain('href="/desired-items/new"');
    });

    it("shows the on-pause count, not the invite, once items exist but none are released", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
      vi.mocked(prisma.desiredItem.count).mockResolvedValueOnce(2); // total
      vi.mocked(prisma.desiredItem.count).mockResolvedValueOnce(0); // released
      vi.mocked(listWaitingQueue).mockResolvedValueOnce({
        elapsed: [],
        stillWaiting: [{ id: "1" }, { id: "2" }] as never,
      });

      const html = await render();

      expect(html).toContain("Nothing let go yet");
      expect(html).toContain("2 items on pause");
      expect(html).not.toContain("Pause your first item");
    });

    it("shows the real Kept figure once at least one item has been released", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
      vi.mocked(prisma.desiredItem.count).mockResolvedValueOnce(3); // total
      vi.mocked(prisma.desiredItem.count).mockResolvedValueOnce(1); // released
      vi.mocked(getKeptSummary).mockImplementation(async (_userId, range) =>
        range === "all_time" ? { totalKept: 90, itemsLetGo: 1 } : { totalKept: 0, itemsLetGo: 0 }
      );

      const html = await render();

      expect(html).toContain("$90");
      expect(html).toContain("1 item let go");
      expect(html).not.toContain("Pause your first item");
      expect(html).not.toContain("Nothing let go yet");
    });
  });

  describe("This month budget", () => {
    it("prompts inline to set a plan when none exists yet", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);

      const html = await render();

      expect(html).toContain("No plan set");
      expect(html).toContain('action="/api/budget"');
    });

    it("shows spend of plan and what's left when under budget", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(getMonthSpend).mockResolvedValueOnce(210);

      const html = await render();

      expect(html).toContain("$210");
      expect(html).toContain("of $400");
      expect(html).toContain("$190 left in your plan");
    });

    it("shows the overage in deep-rose text, not a warning color or icon, when over budget", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(getMonthSpend).mockResolvedValueOnce(440);

      const html = await render();

      expect(html).toContain("$40 over your plan");
      expect(html).toContain("var(--color-accent)");
      expect(html).not.toMatch(/warning|⚠/i);
    });
  });

  it("only renders the receipts banner when there's at least one to review", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(prisma.purchase.count).mockResolvedValueOnce(0);
    const withoutBanner = await render();
    expect(withoutBanner).not.toContain("need a quick look");

    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(prisma.purchase.count).mockResolvedValueOnce(3);
    const withBanner = await render();
    expect(withBanner).toContain("3 receipts need a quick look");
    expect(withBanner).toContain('href="/purchases"');
  });

  describe("On pause section", () => {
    it("shows one quiet line, not a big empty state, when nothing is on pause", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);

      const html = await render();

      expect(html).toContain("Nothing on pause right now.");
    });

    it("renders elapsed and still-waiting items as cards with name, brand, and a fixed unlock phrase", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
      vi.mocked(listWaitingQueue).mockResolvedValueOnce({
        elapsed: [{ id: "e1", itemName: "Wool Coat", brand: "Everlane", waitUntil: new Date(0), imageUrl: null }],
        stillWaiting: [{ id: "w1", itemName: "Boots", brand: null, waitUntil: new Date(Date.now() + 86_400_000), imageUrl: null }],
      } as never);

      const html = await render();

      expect(html).toContain("Wool Coat");
      expect(html).toContain("Everlane");
      expect(html).toContain("ready for a decision");
      expect(html).toContain("Boots");
      expect(html).toContain('href="/desired-items/e1/pause"');
      // No ticking countdown - just the fixed phrase computed once.
      expect(html).not.toMatch(/\d+:\d+:\d+/);
    });
  });

  it("shows the last 5 recent purchases and links onward to the wardrobe", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1" } } as never);
    vi.mocked(prisma.purchase.findMany).mockResolvedValueOnce([
      { id: "p1", itemName: "Sweater", merchant: "Everlane", price: "80.00", imageUrl: null, orderDate: new Date("2026-09-01") },
    ] as never);

    const html = await render();

    expect(html).toContain("Sweater");
    expect(html).toContain("Everlane");
    expect(html).toContain("$80.00");
    expect(html).toContain('href="/wardrobe"');
    expect(html).toContain("See all in wardrobe");
  });
});
