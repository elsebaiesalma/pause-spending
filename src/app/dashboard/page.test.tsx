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

// Only the database readers are replaced; the pure helpers stay real.
vi.mock("@/lib/dashboard/monthlyRecap", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dashboard/monthlyRecap")>()),
  loadMonthlyRecap: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/dashboard/pausePattern", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dashboard/pausePattern")>()),
  loadPausePattern: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/goals/savingsGoal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/goals/savingsGoal")>()),
  getSavingsGoal: vi.fn().mockResolvedValue(null),
  isGoalStorageAvailable: vi.fn().mockResolvedValue(true),
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
import { loadMonthlyRecap } from "@/lib/dashboard/monthlyRecap";
import { buildPausePattern, loadPausePattern } from "@/lib/dashboard/pausePattern";
import { getSavingsGoal, isGoalStorageAvailable } from "@/lib/goals/savingsGoal";
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

  it("has the add box, which only offers typing", async () => {
    const html = await render();

    expect(html).toContain("Type what caught your eye");
    expect(html).not.toContain("Add a screenshot");
    expect(html).not.toContain("Paste a link");
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
      vi.mocked(getSavingsGoal).mockResolvedValueOnce({ name: "Winter boots", target: 800, saved: 0, lastAdded: null });
      const html = await render();

      expect(html).toContain("No plan set for October.");
      expect(html).toContain('href="/budget?open=plan"');
      expect(html).not.toContain('action="/api/budget"');
      expect(html).not.toContain(">Left<");
      expect(html).not.toContain("over your plan");
    });

    it("shows spent against the plan: spent, what is left, and the plan it is measured against", async () => {
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(getMonthSpend).mockResolvedValueOnce(210);

      const html = await render();

      expect(html).not.toContain("What would help most?");
      expect(html).toContain("<strong>$210 spent</strong>");
      expect(html).toContain("$190 left");
      expect(html).toContain("of your $400 plan");
      expect(html).toContain("Edit budget");
    });

    it("words an overage as over, with a warning icon, instead of what is left", async () => {
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);
      vi.mocked(getMonthSpend).mockResolvedValueOnce(440);

      const html = await render();

      expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>.*<\/svg> \$40 over</);
      expect(html).not.toContain("left</span>");
    });

    it("shows what was saved in the at-a-glance line, linking to the let-go list", async () => {
      vi.mocked(getKeptSummary).mockResolvedValueOnce({ totalKept: 120, itemsLetGo: 2 });
      const html = await render();

      expect(html).toMatch(/<strong>\$120<\/strong><span>saved/);
      expect(html).toContain('href="/considering?tab=let-go"');
    });
  });

  describe("Your closet", () => {
    it("shows the real piece count and links to the wardrobe", async () => {
      vi.mocked(prisma.wardrobeItem.findMany).mockResolvedValueOnce([
        wardrobeRow("a", "Tee", "tops", "2026-03-01"),
        wardrobeRow("b", "Boots", "shoes", "2026-04-01"),
      ] as never);

      const html = await render();

      expect(html).toMatch(/<strong>2<\/strong><span>pieces in your closet/);
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

      expect(html).toMatch(/<strong>2<\/strong><span>on pause/);
      vi.mocked(prisma.desiredItem.count).mockResolvedValue(0);
    });
  });

  describe("recap, goal and pattern", () => {
    const START = new Date("2026-10-01T12:00:00Z");
    const finished = (hours: number, outcome: "dropped" | "proceeded") => ({
      pausedAt: START,
      waitUntil: new Date(START.getTime() + hours * 3_600_000),
      outcome,
    });

    afterEach(() => {
      vi.mocked(loadMonthlyRecap).mockResolvedValue(null);
      vi.mocked(loadPausePattern).mockResolvedValue(null);
      vi.mocked(getSavingsGoal).mockResolvedValue(null);
    });

    it("shows no recap outside the first week, and the recap under Get to know PAUSE when there is one", async () => {
      expect(await render()).not.toContain("in PAUSE");

      vi.mocked(loadMonthlyRecap).mockResolvedValueOnce({
        monthKey: "2026-09",
        monthLabel: "September",
        comparison: null,
        tip: null,
        stats: { confirmed: 3, paused: 3, letGo: 1, saved: 120, mostResisted: { label: "Shoes", count: 1 } },
      });
      const html = await render();

      expect(html).toContain("Your September in PAUSE");
      expect(html).toContain("See September’s decisions");
      expect(html.indexOf("Get to know PAUSE")).toBeLessThan(html.indexOf("Your September in PAUSE"));
    });

    it("asks what would help most when neither a plan nor a goal is set, on the full row", async () => {
      const html = await render();

      expect(html).toContain("What would help most?");
      expect(html).toContain("Stay under a monthly amount");
      expect(html).not.toContain("What works for you");
    });

    it("offers only the plan when the goals table is missing", async () => {
      vi.mocked(isGoalStorageAvailable).mockResolvedValueOnce(false);

      const html = await render();

      expect(html).toContain("Stay under a monthly amount");
      expect(html).not.toContain("Save toward something");
      expect(html).not.toContain("Saving for something?");
    });

    it("shows a quiet 'also try' for the goal once there is a plan, and no choice card", async () => {
      vi.mocked(getBudgetForMonth).mockResolvedValueOnce({ amount: "400" } as never);

      const html = await render();

      expect(html).not.toContain("What would help most?");
      expect(html).toContain("Saving for something?");
      expect(html).toContain("Set a savings goal");
    });

    it("shows the goal beside the pattern once there are finished pauses", async () => {
      vi.mocked(getSavingsGoal).mockResolvedValueOnce({ name: "Winter boots", target: 800, saved: 540, lastAdded: null });
      vi.mocked(loadPausePattern).mockResolvedValueOnce(
        buildPausePattern([
          finished(24, "dropped"),
          finished(24, "proceeded"),
          finished(168, "dropped"),
          finished(168, "dropped"),
          finished(168, "proceeded"),
        ])
      );

      const html = await render();

      expect(html).toContain("Winter boots");
      expect(html).toContain("$260 to go");
      expect(html).toContain("What works for you");
      expect(html).not.toContain("insightsSingle");
    });

    it("hides the pattern when it can't be read", async () => {
      vi.mocked(loadPausePattern).mockResolvedValueOnce(null);

      const html = await render();

      expect(html).not.toContain("What works for you");
      expect(html).not.toContain("Your pattern shows up");
    });
  });

  it("ends with a quote and its source", async () => {
    const html = await render();

    expect(html).toContain("<blockquote");
    expect(html).toContain("<figcaption");
  });
});
