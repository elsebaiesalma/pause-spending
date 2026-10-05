import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getKeptSummary } from "./kept";

describe("getKeptSummary", () => {
  let userId: string;
  const createdItemIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdItemIds } } });
    createdItemIds.length = 0;
  });

  async function makeDesiredItem(overrides: {
    price?: string | null;
    decisionOutcome?: string | null;
    userConfirmed?: boolean;
    createdAt?: Date;
  }) {
    const item = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: "Test Item",
        price: overrides.price ?? null,
        decisionOutcome: overrides.decisionOutcome ?? null,
        userConfirmed: overrides.userConfirmed ?? true,
        pauseStatus: "proceeded",
        createdAt: overrides.createdAt ?? new Date("2026-03-15"),
      },
    });
    createdItemIds.push(item.id);
    return item;
  }

  it("sums confirmed prices of dropped items only", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    await makeDesiredItem({ price: "40", decisionOutcome: "dropped" });
    await makeDesiredItem({ price: "60", decisionOutcome: "dropped" });

    const summary = await getKeptSummary(userId, "all_time", new Date("2026-03-20"));
    expect(summary.totalKept).toBe(100);
    expect(summary.itemsLetGo).toBe(2);
  });

  it("never counts items paused then purchased (decisionOutcome proceeded)", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    await makeDesiredItem({ price: "500", decisionOutcome: "proceeded" });
    await makeDesiredItem({ price: "30", decisionOutcome: "dropped" });

    const summary = await getKeptSummary(userId, "all_time", new Date("2026-03-20"));
    expect(summary.totalKept).toBe(30);
    expect(summary.itemsLetGo).toBe(1);
  });

  it("never counts an unconfirmed price, even on a dropped item", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    // Dropped with no price ever confirmed (left blank at /confirm).
    await makeDesiredItem({ price: null, decisionOutcome: "dropped" });
    // Dropped with a price value present but never run through /confirm -
    // the API doesn't hard-enforce the confirm step, so this must still
    // be excluded on userConfirmed alone.
    await makeDesiredItem({ price: "75", decisionOutcome: "dropped", userConfirmed: false });
    await makeDesiredItem({ price: "20", decisionOutcome: "dropped" });

    const summary = await getKeptSummary(userId, "all_time", new Date("2026-03-20"));
    expect(summary.totalKept).toBe(20);
    expect(summary.itemsLetGo).toBe(1);
  });

  it("ignores items still pending a decision (no decisionOutcome yet)", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    await makeDesiredItem({ price: "45", decisionOutcome: null });

    const summary = await getKeptSummary(userId, "all_time", new Date("2026-03-20"));
    expect(summary.totalKept).toBe(0);
    expect(summary.itemsLetGo).toBe(0);
  });

  it("this_month scopes to the given month only, all_time spans every month", async () => {
    userId = (await prisma.user.findFirstOrThrow()).id;

    await makeDesiredItem({ price: "100", decisionOutcome: "dropped", createdAt: new Date("2026-03-05") });
    await makeDesiredItem({ price: "200", decisionOutcome: "dropped", createdAt: new Date("2026-03-28") });
    // A different month - must not count toward March's "this month" total.
    await makeDesiredItem({ price: "999", decisionOutcome: "dropped", createdAt: new Date("2026-02-15") });

    const thisMonth = await getKeptSummary(userId, "this_month", new Date("2026-03-20"));
    expect(thisMonth.totalKept).toBe(300);
    expect(thisMonth.itemsLetGo).toBe(2);

    const allTime = await getKeptSummary(userId, "all_time", new Date("2026-03-20"));
    expect(allTime.totalKept).toBe(1299);
    expect(allTime.itemsLetGo).toBe(3);
  });
});
