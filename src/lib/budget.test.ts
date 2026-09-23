import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  computeSuggestedBudget,
  getBudgetForMonth,
  getMonthSpend,
  monthKeyForDate,
  setBudgetForMonth,
} from "./budget";

describe("budget service", () => {
  let userId: string;
  const createdPurchaseIds: string[] = [];

  afterEach(async () => {
    await prisma.purchase.deleteMany({ where: { id: { in: createdPurchaseIds } } });
    await prisma.budget.deleteMany({ where: { userId, month: { in: ["2026-01", "2026-02", "2026-03"] } } });
    createdPurchaseIds.length = 0;
  });

  async function makePurchase(price: string, orderDate: Date, status = "active") {
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        merchant: "Test Retailer",
        orderDate,
        itemName: "Test Item",
        price,
        category: "tops",
        status,
      },
    });
    createdPurchaseIds.push(purchase.id);
    return purchase;
  }

  it("sums only active purchases within the given month", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    await makePurchase("100", new Date("2026-02-05"));
    await makePurchase("50", new Date("2026-02-20"));
    // Different month - must not count toward February's spend.
    await makePurchase("999", new Date("2026-01-15"));
    // needs_review - a placeholder, must not count as real spend.
    await makePurchase("500", new Date("2026-02-10"), "needs_review");

    const spend = await getMonthSpend(userId, "2026-02");
    expect(spend).toBe(150);
  });

  it("computes the suggested budget as the average of past months' spend, excluding the target month", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    await makePurchase("100", new Date("2025-11-10"));
    await makePurchase("200", new Date("2025-12-05"));
    // The month being budgeted for must not skew its own suggestion.
    await makePurchase("9999", new Date("2026-01-05"));

    const suggestion = await computeSuggestedBudget(userId, "2026-01");
    expect(suggestion).toBe(150);
  });

  it("returns null (no suggestion) when there is no purchase history at all", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    const suggestion = await computeSuggestedBudget(userId, "2026-06");
    expect(suggestion).toBeNull();
  });

  it("computing a suggestion never writes a budget row", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;
    await makePurchase("100", new Date("2025-11-10"));

    await computeSuggestedBudget(userId, "2026-01");

    const budget = await getBudgetForMonth(userId, "2026-01");
    expect(budget).toBeNull();
  });

  it("getBudgetForMonth returns null when no budget has been set yet", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    const budget = await getBudgetForMonth(userId, "2026-03");
    expect(budget).toBeNull();
  });

  it("setBudgetForMonth is the only thing that creates a budget row, and it's idempotent per month", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    await setBudgetForMonth(userId, "2026-03", 300);
    const first = await getBudgetForMonth(userId, "2026-03");
    expect(Number(first?.amount)).toBe(300);

    await setBudgetForMonth(userId, "2026-03", 350);
    const second = await getBudgetForMonth(userId, "2026-03");
    expect(Number(second?.amount)).toBe(350);
    expect(second?.id).toBe(first?.id);
  });

  it("monthKeyForDate formats a date as YYYY-MM in UTC", () => {
    expect(monthKeyForDate(new Date("2026-01-31T23:00:00Z"))).toBe("2026-01");
  });
});
