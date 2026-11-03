import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/budget";
import { parseMockWardrobe } from "@/lib/mockWardrobe";
import mockWardrobeJson from "../../data/mock-wardrobe.json";
import { cleanForDemo, createDemoSession, DEMO_EMAIL_DOMAIN, isDemoEmail, shiftToCurrentMonth } from "./demo";

const items = parseMockWardrobe(mockWardrobeJson);

describe("shiftToCurrentMonth", () => {
  it("moves the newest purchase into the current month and keeps the gaps between purchases", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    const shifted = shiftToCurrentMonth(items, now);
    const newest = shifted.reduce((max, i) => (i.purchasedAt > max ? i.purchasedAt : max), "");
    expect(newest.slice(0, 7)).toBe("2026-11");

    // The original newest is Sept 2026, so everything moves two months.
    const original = items.find((i) => i.purchasedAt.startsWith("2025-11-14"))!;
    expect(shifted.find((i) => i.key === original.key)!.purchasedAt).toBe("2026-01-14");
  });

  it("never dates a purchase in the future or on a day the month doesn't have", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    for (const item of shiftToCurrentMonth(items, now)) {
      expect(new Date(`${item.purchasedAt}T00:00:00Z`).getTime()).toBeLessThanOrEqual(now.getTime());
      expect(Number.isNaN(new Date(`${item.purchasedAt}T00:00:00Z`).getTime())).toBe(false);
    }
    const leap = shiftToCurrentMonth([{ ...items[0], purchasedAt: "2026-01-31" }], new Date("2026-02-27T00:00:00Z"));
    expect(leap[0].purchasedAt).toBe("2026-02-27");
  });

  it("leaves dates alone when they're already current", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(shiftToCurrentMonth(items, now).map((i) => i.purchasedAt)).toEqual(items.map((i) => i.purchasedAt));
  });
});

describe("cleanForDemo", () => {
  it("leaves no unknown prices and nothing flagged for review, so the demo shows no Gmail leftovers", () => {
    expect(items.some((i) => i.price === null || i.needsReview)).toBe(true);
    const cleaned = cleanForDemo(items);
    expect(cleaned).toHaveLength(items.length);
    expect(cleaned.every((i) => typeof i.price === "number" && i.price > 0)).toBe(true);
    expect(cleaned.every((i) => !i.needsReview)).toBe(true);
  });

  it("keeps known prices as they were", () => {
    const cleaned = cleanForDemo(items);
    items.forEach((item, idx) => {
      if (item.price !== null) expect(cleaned[idx].price).toBe(item.price);
    });
  });
});

describe("isDemoEmail", () => {
  it("only matches the demo domain", () => {
    expect(isDemoEmail(`guest-1@${DEMO_EMAIL_DOMAIN}`)).toBe(true);
    expect(isDemoEmail("someone@gmail.com")).toBe(false);
    expect(isDemoEmail(null)).toBe(false);
  });
});

describe("createDemoSession", () => {
  afterAll(async () => {
    // Deleting the user cascades to its session, purchases, wardrobe and budget.
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } });
  });

  it("creates a separate account per visitor, with the full sample closet, a budget and a live session", async () => {
    const a = await createDemoSession();
    const b = await createDemoSession();
    expect(a.sessionToken).not.toBe(b.sessionToken);

    const session = await prisma.session.findUniqueOrThrow({
      where: { sessionToken: a.sessionToken },
      include: { user: true },
    });
    expect(isDemoEmail(session.user.email)).toBe(true);
    expect(session.expires.getTime()).toBeGreaterThan(Date.now());

    const other = await prisma.session.findUniqueOrThrow({ where: { sessionToken: b.sessionToken } });
    expect(other.userId).not.toBe(session.userId);

    const wardrobe = await prisma.wardrobeItem.count({ where: { userId: session.userId } });
    expect(wardrobe).toBe(items.length);

    const budget = await prisma.budget.findUnique({
      where: { userId_month: { userId: session.userId, month: currentMonthKey() } },
    });
    expect(Number(budget?.amount)).toBeGreaterThan(0);
  });
});
