import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/considering/consideringMeta", () => ({
  sweepEndedPauses: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/budget", () => ({
  currentMonthKey: vi.fn().mockReturnValue("2026-10"),
  getBudgetForMonth: vi.fn().mockResolvedValue(null),
  getMonthSpend: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/dashboard/kept", () => ({
  getKeptSummary: vi.fn().mockResolvedValue({ totalKept: 0, itemsLetGo: 0 }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    purchase: { count: vi.fn().mockResolvedValue(0) },
    wardrobeItem: { findMany: vi.fn().mockResolvedValue([]) },
    desiredItem: { count: vi.fn().mockResolvedValue(0) },
    look: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sweepEndedPauses } from "@/lib/considering/consideringMeta";
import { getBudgetForMonth, getMonthSpend } from "@/lib/budget";
import { getKeptSummary } from "@/lib/dashboard/kept";
import DashboardPage from "./page";

const SIGNED_IN = { user: { id: "u1", name: "Salma Elsebaie" } } as never;

function wardrobeRow(id: string, name: string, category: string, ownedSince: string) {
  return {
    id,
    itemName: name,
    category,
    colorName: null,
    colorFamily: null,
    imageUrl: null,
    ownedSince: new Date(ownedSince),
    status: "active",
    sourcePurchase: { merchant: "COS", price: "59" },
  };
}

describe("DashboardPage (Home)", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(sweepEndedPauses).mockClear();
    vi.mocked(getBudgetForMonth).mockResolvedValue(null);
    vi.mocked(getMonthSpend).mockResolvedValue(0);
    vi.mocked(getKeptSummary).mockResolvedValue({ totalKept: 0, itemsLetGo: 0 });
    vi.mocked(prisma.purchase.count).mockReset().mockResolvedValue(0);
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

    expect(html).not.toContain("On pause");
    expect(html).not.toContain("Recent purchases");
  });

  describe("status lines", () => {
    it("shows no receipts line when nothing needs a look", async () => {
      expect(await render()).not.toContain("need a quick look");
    });

    it("links the receipts line to review", async () => {
      vi.mocked(prisma.purchase.count).mockResolvedValueOnce(3);

      const html = await render();

      expect(html).toContain("3 receipts need a quick look");
      expect(html).toContain('href="/purchases"');
    });

    it("never reminds anyone of a paused item: pauses end silently", async () => {
      const html = await render();

      expect(html).not.toContain("is up");
      expect(html).not.toContain("Your pause on");
      // The only thing Home does about ended pauses is quietly move them.
      expect(sweepEndedPauses).toHaveBeenCalledWith("u1");
    });
  });

  describe("This month", () => {
    it("links to set a plan when none exists, with the month named, and no receipt block", async () => {
      const html = await render();

      expect(html).toContain("No plan set for October yet.");
      expect(html).toContain('href="/budget"');
      expect(html).not.toContain('action="/api/budget"');
      expect(html).not.toContain(">Left<");
      expect(html).not.toContain("over your plan");
    });

    it("shows spent against the plan, and the receipt: spent, plan, then what is left", async () => {
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(getMonthSpend).mockResolvedValueOnce(210);

      const html = await render();

      expect(html).toContain("$210");
      expect(html).toContain("of your $400 plan");
      expect(html).toMatch(/Spent<\/span><span[^>]*>\$210/);
      expect(html).toMatch(/Plan<\/span><span[^>]*>\$400/);
      expect(html).toMatch(/Left<\/span><span[^>]*>\$190/);
    });

    it("words an overage as over your plan, in the accent colour, without warning styling", async () => {
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(getMonthSpend).mockResolvedValueOnce(440);

      const html = await render();

      expect(html).toContain("$40 over your plan");
      expect(html).not.toContain(">Left<");
      expect(html).not.toMatch(/warning|⚠/i);
    });

    it("hides the let-go line until something has been let go, then links to the let-go list", async () => {
      expect(await render()).not.toContain("by letting");

      vi.mocked(getKeptSummary).mockResolvedValueOnce({ totalKept: 120, itemsLetGo: 2 });
      const html = await render();

      expect(html).toContain("$120 saved by letting 2 things");
      expect(html).toContain('href="/considering/let-go"');
    });
  });

  describe("Your wardrobe", () => {
    it("shows the real piece count and links to the wardrobe", async () => {
      vi.mocked(prisma.wardrobeItem.findMany).mockResolvedValueOnce([
        wardrobeRow("a", "Tee", "tops", "2026-03-01"),
        wardrobeRow("b", "Boots", "shoes", "2026-04-01"),
      ] as never);

      const html = await render();

      expect(html).toContain("pieces you already own");
      expect(html).toContain('href="/wardrobe"');
    });

    it("hangs only the newest hanging-category pieces on the short rail, linking to the Rack view", async () => {
      vi.mocked(prisma.wardrobeItem.findMany).mockResolvedValueOnce([
        wardrobeRow("a", "Older Tee", "tops", "2026-01-01"),
        wardrobeRow("b", "Newest Boots", "shoes", "2026-09-01"),
        wardrobeRow("c", "Wool Coat", "outerwear", "2026-08-01"),
        wardrobeRow("d", "Newest Bag", "bags", "2026-09-15"),
      ] as never);

      const html = await render();

      expect(html).toContain("Wool Coat");
      expect(html).toContain("Older Tee");
      expect(html).not.toContain("Newest Boots");
      expect(html).not.toContain("Newest Bag");
      expect(html.indexOf("Wool Coat")).toBeLessThan(html.indexOf("Older Tee"));
      expect(html).toContain('href="/wardrobe?view=rack"');
      expect(html).toContain("See your closet");
    });

    it("offers a quiet first-piece link for an empty wardrobe, and no rail", async () => {
      const html = await render();

      expect(html).toContain("Add your first piece");
      expect(html).not.toContain("Recently added pieces");
    });
  });

  describe("setup guide and at a glance", () => {
    it("shows the setup guide with the first step open for a new account", async () => {
      const html = await render();

      expect(html).toContain("Get to know PAUSE");
      expect(html).toContain("0 of 3 done");
      expect(html).toContain('href="/desired-items/new"');
    });

    it("hides the setup guide once every step is done", async () => {
      vi.mocked(prisma.desiredItem.count).mockResolvedValue(1);
      vi.mocked(prisma.look.count).mockResolvedValueOnce(1);

      const html = await render();

      expect(html).not.toContain("Get to know PAUSE");
      vi.mocked(prisma.desiredItem.count).mockResolvedValue(0);
    });

    it("counts paused items without naming any of them", async () => {
      vi.mocked(prisma.desiredItem.count).mockResolvedValue(2);

      const html = await render();

      expect(html).toContain("Paused right now");
      expect(html).toContain("items waiting it out");
      vi.mocked(prisma.desiredItem.count).mockResolvedValue(0);
    });
  });

  it("ends with a quote and its source", async () => {
    const html = await render();

    expect(html).toContain("<blockquote");
    expect(html).toContain("<figcaption");
  });
});
