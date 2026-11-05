import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  loadMonthlyRecap,
  localDate,
  monthStats,
  pausedComparison,
  previousMonthKey,
  recapTip,
  shouldShowRecap,
  type MonthStats,
  type RecapItem,
} from "./monthlyRecap";

function item(overrides: Partial<Omit<RecapItem, "createdAt">> & { createdAt: string }): RecapItem {
  return {
    userConfirmed: true,
    pauseStatus: "waiting",
    decisionOutcome: null,
    price: null,
    category: null,
    ...overrides,
    createdAt: new Date(overrides.createdAt),
  };
}

const EMPTY: MonthStats = { confirmed: 0, paused: 0, letGo: 0, saved: 0, mostResisted: null };

describe("previousMonthKey", () => {
  it("steps back one month and wraps January to the previous December", () => {
    expect(previousMonthKey("2026-11")).toBe("2026-10");
    expect(previousMonthKey("2026-01")).toBe("2025-12");
    expect(previousMonthKey("2026-10")).toBe("2026-09");
  });
});

describe("monthStats", () => {
  it("counts only confirmed items created inside the month, with exact UTC boundaries", () => {
    const stats = monthStats(
      [
        item({ createdAt: "2026-10-01T00:00:00Z" }),
        item({ createdAt: "2026-10-31T23:59:59Z" }),
        item({ createdAt: "2026-09-30T23:59:59Z" }),
        item({ createdAt: "2026-11-01T00:00:00Z" }),
        item({ createdAt: "2026-10-15T00:00:00Z", userConfirmed: false }),
      ],
      "2026-10"
    );
    expect(stats.confirmed).toBe(2);
  });

  it("counts an item as paused unless it never left the confirm step", () => {
    const stats = monthStats(
      [
        item({ createdAt: "2026-10-05T00:00:00Z", pauseStatus: "waiting" }),
        item({ createdAt: "2026-10-06T00:00:00Z", pauseStatus: "saved_for_later" }),
        item({ createdAt: "2026-10-07T00:00:00Z", pauseStatus: "pending_confirmation" }),
      ],
      "2026-10"
    );
    expect(stats).toMatchObject({ confirmed: 3, paused: 2 });
  });

  it("sums let-go prices and counts unpriced let-go items without adding to the total", () => {
    const stats = monthStats(
      [
        item({ createdAt: "2026-10-05T00:00:00Z", decisionOutcome: "dropped", price: 189 }),
        item({ createdAt: "2026-10-06T00:00:00Z", decisionOutcome: "dropped", price: 50.5 }),
        item({ createdAt: "2026-10-07T00:00:00Z", decisionOutcome: "dropped", price: null }),
        item({ createdAt: "2026-10-08T00:00:00Z", decisionOutcome: "proceeded", price: 300 }),
      ],
      "2026-10"
    );
    expect(stats.letGo).toBe(3);
    expect(stats.saved).toBeCloseTo(239.5);
  });

  it("names the category with the most let-go items, in its plural label", () => {
    const stats = monthStats(
      [
        item({ createdAt: "2026-10-05T00:00:00Z", decisionOutcome: "dropped", category: "shoes", price: 100 }),
        item({ createdAt: "2026-10-06T00:00:00Z", decisionOutcome: "dropped", category: "Shoes", price: 90 }),
        item({ createdAt: "2026-10-07T00:00:00Z", decisionOutcome: "dropped", category: "tops", price: 20 }),
      ],
      "2026-10"
    );
    expect(stats.mostResisted?.count).toBe(2);
    expect(stats.mostResisted?.label.toLowerCase()).toContain("shoes");
  });

  it("breaks a tie by amount, then by label, regardless of row order", () => {
    const rows = [
      item({ createdAt: "2026-10-05T00:00:00Z", decisionOutcome: "dropped", category: "tops", price: 30 }),
      item({ createdAt: "2026-10-06T00:00:00Z", decisionOutcome: "dropped", category: "bags", price: 200 }),
    ];
    const forward = monthStats(rows, "2026-10").mostResisted?.label;
    const backward = monthStats([...rows].reverse(), "2026-10").mostResisted?.label;
    expect(forward?.toLowerCase()).toContain("bags");
    expect(backward).toBe(forward);

    const sameAmount = [
      item({ createdAt: "2026-10-05T00:00:00Z", decisionOutcome: "dropped", category: "tops", price: 50 }),
      item({ createdAt: "2026-10-06T00:00:00Z", decisionOutcome: "dropped", category: "bags", price: 50 }),
    ];
    const first = monthStats(sameAmount, "2026-10").mostResisted?.label;
    expect(monthStats([...sameAmount].reverse(), "2026-10").mostResisted?.label).toBe(first);
  });

  it("has no most-resisted category when nothing was let go", () => {
    expect(monthStats([item({ createdAt: "2026-10-05T00:00:00Z" })], "2026-10").mostResisted).toBeNull();
  });
});

describe("pausedComparison", () => {
  const current = { ...EMPTY, confirmed: 8, paused: 8 };

  it("says more, fewer or the same in neutral words", () => {
    expect(pausedComparison(current, { ...EMPTY, confirmed: 6, paused: 6 }, "September")).toBe("2 more than September");
    expect(pausedComparison(current, { ...EMPTY, confirmed: 9, paused: 9 }, "September")).toBe("1 fewer than September");
    expect(pausedComparison(current, { ...EMPTY, confirmed: 8, paused: 8 }, "September")).toBe("Same as September");
  });

  it("says nothing when the month before had no data", () => {
    expect(pausedComparison(current, EMPTY, "September")).toBeNull();
  });
});

describe("shouldShowRecap", () => {
  const lastMonth = { ...EMPTY, confirmed: 1 };

  it("shows through the 7th and hides from the 8th", () => {
    expect(shouldShowRecap(new Date("2026-11-01T00:00:00Z"), lastMonth)).toBe(true);
    expect(shouldShowRecap(new Date("2026-11-07T23:59:59Z"), lastMonth)).toBe(true);
    expect(shouldShowRecap(new Date("2026-11-08T00:00:00Z"), lastMonth)).toBe(false);
  });

  it("hides when last month had nothing confirmed", () => {
    expect(shouldShowRecap(new Date("2026-11-03T00:00:00Z"), EMPTY)).toBe(false);
  });
});

describe("loadMonthlyRecap", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });

  async function makeUser() {
    const user = await prisma.user.create({
      data: { email: `recap-${Math.random().toString(36).slice(2, 8)}@example.test` },
    });
    userIds.push(user.id);
    return user;
  }

  async function add(
    userId: string,
    createdAt: string,
    extra: { decisionOutcome?: string; price?: string; category?: string } = {}
  ) {
    await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: "Thing",
        userConfirmed: true,
        pauseStatus: "proceeded",
        createdAt: new Date(createdAt),
        ...extra,
      },
    });
  }

  it("recaps last month for the signed-in user only, compared with the month before", async () => {
    const me = await makeUser();
    const other = await makeUser();
    await add(me.id, "2026-10-05T12:00:00Z", { decisionOutcome: "dropped", price: "189", category: "shoes" });
    await add(me.id, "2026-10-10T12:00:00Z", { decisionOutcome: "proceeded", price: "40" });
    await add(me.id, "2026-09-10T12:00:00Z");
    await add(other.id, "2026-10-12T12:00:00Z", { decisionOutcome: "dropped", price: "999", category: "bags" });

    const recap = await loadMonthlyRecap(me.id, new Date("2026-11-03T15:00:00Z"));
    expect(recap).toMatchObject({
      monthKey: "2026-10",
      monthLabel: "October",
      comparison: "1 more than September",
      stats: { confirmed: 2, paused: 2, letGo: 1, saved: 189 },
    });
    expect(recap?.stats.mostResisted?.count).toBe(1);
  });

  it("returns nothing after the first week or when last month was empty", async () => {
    const me = await makeUser();
    await add(me.id, "2026-10-05T12:00:00Z");
    expect(await loadMonthlyRecap(me.id, new Date("2026-11-09T12:00:00Z"))).toBeNull();
    const empty = await makeUser();
    expect(await loadMonthlyRecap(empty.id, new Date("2026-11-03T12:00:00Z"))).toBeNull();
  });

  it("wraps January back to December", async () => {
    const me = await makeUser();
    await add(me.id, "2026-12-20T12:00:00Z");
    const recap = await loadMonthlyRecap(me.id, new Date("2027-01-02T12:00:00Z"));
    expect(recap).toMatchObject({ monthKey: "2026-12", monthLabel: "December" });
  });

  it("recaps the current month all month for demo accounts, compared with last month", async () => {
    const me = await makeUser();
    await add(me.id, "2026-11-02T12:00:00Z", { decisionOutcome: "dropped", price: "50", category: "tops" });
    await add(me.id, "2026-10-15T12:00:00Z");
    const recap = await loadMonthlyRecap(me.id, new Date("2026-11-20T12:00:00Z"), { allMonth: true });
    expect(recap).toMatchObject({
      monthKey: "2026-11",
      monthLabel: "November",
      comparison: "Same as October",
      stats: { confirmed: 1, letGo: 1, saved: 50 },
    });
  });

  it("reads the month in the person's time zone", async () => {
    const me = await makeUser();
    await add(me.id, "2026-11-01T01:00:00Z", { decisionOutcome: "dropped", price: "20" });
    await add(me.id, "2026-10-12T12:00:00Z");
    // 03:00 UTC on 1 December is still 30 November in Toronto.
    const at = new Date("2026-12-01T03:00:00Z");
    const toronto = await loadMonthlyRecap(me.id, at, { allMonth: true, timeZone: "America/Toronto" });
    expect(toronto?.monthKey).toBe("2026-11");
    const utc = await loadMonthlyRecap(me.id, at, { allMonth: true });
    expect(utc).toBeNull();
  });
});

describe("recapTip", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 9, day, 12));
  const item = (day: number, outcome: string | null, waitDays: number | null) => ({
    createdAt: at(day),
    userConfirmed: true,
    pauseStatus: "proceeded",
    decisionOutcome: outcome,
    price: 50,
    category: "tops",
    pausedAt: waitDays === null ? null : at(day),
    waitUntil: waitDays === null ? null : new Date(at(day).getTime() + waitDays * 86_400_000),
  });

  it("says longer pauses work when 7-day waits ended in more let-gos than 24-hour ones", () => {
    const items = [item(3, "dropped", 7), item(5, "dropped", 7), item(8, "dropped", 1), item(9, "proceeded", 1)];
    expect(recapTip(items, "2026-10")).toMatch(/^Longer pauses work for you/);
  });

  it("falls back to a let-go share, and says nothing when there is nothing honest to say", () => {
    expect(recapTip([item(3, "dropped", null), item(4, "dropped", null), item(5, "proceeded", null)], "2026-10")).toMatch(
      /^Pausing works for you/
    );
    expect(recapTip([item(3, "proceeded", 7), item(4, "dropped", 1)], "2026-10")).toBeNull();
  });
});

describe("localDate", () => {
  it("shifts to the local calendar day and ignores unknown zones", () => {
    const at = new Date("2026-12-01T03:00:00Z");
    expect(localDate(at, "America/Toronto").toISOString().slice(0, 10)).toBe("2026-11-30");
    expect(localDate(at, "Not/AZone")).toBe(at);
    expect(localDate(at, null)).toBe(at);
  });
});
