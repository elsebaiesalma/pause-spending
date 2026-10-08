import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/waitQueue", () => ({
  listWaitingQueue: vi.fn().mockResolvedValue({ elapsed: [], stillWaiting: [] }),
}));

vi.mock("@/lib/budget", () => ({
  currentMonthKey: vi.fn().mockReturnValue("2026-10"),
  monthKeyToRange: vi.fn().mockReturnValue({ start: new Date("2026-10-01"), end: new Date("2026-11-01") }),
  getBudgetForMonth: vi.fn().mockResolvedValue(null),
  getMonthSpend: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/dashboard/kept", () => ({
  getKeptSummary: vi.fn().mockResolvedValue({ totalKept: 0, itemsLetGo: 0 }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    purchase: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    wardrobeItem: { findMany: vi.fn().mockResolvedValue([]) },
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

const SIGNED_IN = { user: { id: "u1", name: "Salma Elsebaie" } } as never;

describe("DashboardPage (Home)", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(listWaitingQueue).mockResolvedValue({ elapsed: [], stillWaiting: [] });
    vi.mocked(getBudgetForMonth).mockResolvedValue(null);
    vi.mocked(getMonthSpend).mockResolvedValue(0);
    vi.mocked(getKeptSummary).mockResolvedValue({ totalKept: 0, itemsLetGo: 0 });
    vi.mocked(prisma.purchase.count).mockReset().mockResolvedValue(0);
    vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);
    vi.mocked(prisma.wardrobeItem.findMany).mockResolvedValue([]);
  });

  async function render() {
    vi.mocked(auth).mockResolvedValueOnce(SIGNED_IN);
    return renderToStaticMarkup(await DashboardPage());
  }

  it("redirects to /login instead of rendering when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    await expect(DashboardPage()).rejects.toThrow();
  });

  it("greets by first name only, and carries no account or Gmail section", async () => {
    const html = await render();

    // Greeting text is filled in by the browser (local time); the server HTML
    // holds the space with the first name only.
    expect(html).toContain("Salma");
    expect(html).not.toContain("Elsebaie");
    expect(html).not.toContain("Permanently delete my data");
    expect(html).not.toContain("Sign out");
  });

  it("has the smart add box and a screenshot button", async () => {
    const html = await render();

    expect(html).toContain("Paste a link or type what caught your eye");
    expect(html).toContain("Screenshot");
    expect(html).toContain('action="/api/desired-items/from-screenshot"');
  });

  it("no longer shows the Kept band, On pause section or Recent purchases", async () => {
    const html = await render();

    expect(html).not.toContain("Pause your first item");
    expect(html).not.toContain("On pause");
    expect(html).not.toContain("Recent purchases");
  });

  describe("status lines", () => {
    it("shows neither when nothing applies", async () => {
      const html = await render();

      expect(html).not.toContain("need a quick look");
      expect(html).not.toContain("is up");
    });

    it("links the receipts line to review", async () => {
      vi.mocked(prisma.purchase.count).mockResolvedValueOnce(3);

      const html = await render();

      expect(html).toContain("3 receipts need a quick look");
      expect(html).toContain('href="/purchases"');
    });

    it("links each ended pause to its item", async () => {
      vi.mocked(listWaitingQueue).mockResolvedValueOnce({
        elapsed: [{ id: "e1", itemName: "Wool Coat", waitUntil: new Date(0) }],
        stillWaiting: [{ id: "w1", itemName: "Boots", waitUntil: new Date(Date.now() + 86_400_000) }],
      } as never);

      const html = await render();

      expect(html).toContain("Your pause on Wool Coat is up. Decide when you");
      expect(html).toContain('href="/desired-items/e1/pause"');
      expect(html).not.toContain("Boots");
    });
  });

  describe("This month", () => {
    it("prompts inline to set a plan when none exists, and shows no receipt closing line", async () => {
      const html = await render();

      expect(html).toContain("No plan set");
      expect(html).toContain('action="/api/budget"');
      expect(html).not.toContain("Left in your plan");
      expect(html).not.toContain("Over your plan");
    });

    it("shows spent against the plan, and what is left in the receipt", async () => {
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(getMonthSpend).mockResolvedValueOnce(210);

      const html = await render();

      expect(html).toContain("$210");
      expect(html).toContain("of your $400 plan");
      expect(html).toContain("Left in your plan");
      expect(html).toContain("$190");
    });

    it("words an overage as over the plan, in the accent colour, without warning styling", async () => {
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(getMonthSpend).mockResolvedValueOnce(440);

      const html = await render();

      expect(html).toContain("Over your plan");
      expect(html).toContain("$40");
      expect(html).not.toContain("Left in your plan");
      expect(html).not.toMatch(/warning|⚠/i);
    });

    it("lists purchases as line items, with a +N more when there are over five", async () => {
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(prisma.purchase.count).mockResolvedValueOnce(0); // needs_review
      vi.mocked(prisma.purchase.count).mockResolvedValueOnce(8); // this month
      vi.mocked(prisma.purchase.findMany).mockResolvedValueOnce([
        { id: "p1", itemName: "Sweater", merchant: "Everlane", price: "80.00", orderDate: new Date("2026-10-03") },
      ] as never);

      const html = await render();

      expect(html).toContain("Oct 3");
      expect(html).toContain("Sweater");
      expect(html).toContain("Everlane");
      expect(html).toContain("$80.00");
      expect(html).toContain("+ 7 more");
    });

    it("hides the kept line until something has been let go, then links to Considering", async () => {
      expect(await render()).not.toContain("kept by letting");

      vi.mocked(getKeptSummary).mockResolvedValueOnce({ totalKept: 120, itemsLetGo: 2 });
      const html = await render();

      expect(html).toContain("$120 kept by letting 2 things");
      expect(html).toContain('href="/considering"');
    });
  });

  describe("Your wardrobe", () => {
    it("shows the real piece count, links to the wardrobe, and draws the stripe from colour families", async () => {
      vi.mocked(prisma.wardrobeItem.findMany).mockResolvedValueOnce([
        { colorFamily: "black" },
        { colorFamily: "black" },
        { colorFamily: "navy" },
        { colorFamily: null },
      ] as never);

      const html = await render();

      expect(html).toContain("pieces you already own");
      expect(html).toContain('href="/wardrobe"');
      expect(html).toContain("2 black, 1 navy");
    });

    it("draws no stripe for an empty wardrobe", async () => {
      const html = await render();

      expect(html).toContain("0");
      expect(html).not.toContain("Wardrobe colours");
    });
  });

  it("ends with a quote and its source", async () => {
    const html = await render();

    expect(html).toContain("<blockquote");
    expect(html).toContain("<figcaption");
  });
});
