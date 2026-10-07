import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getKeptSummary } from "@/lib/dashboard/kept";
import { sweepStaleSavedItems } from "@/lib/considering/consideringMeta";
import {
  getStoreVisitState,
  listUndecidedVisits,
  recordStoreVisit,
  setStoreVisitAnswer,
  shouldAskDidYouBuy,
} from "./storeVisit";

// Runs against the test Neon branch (vitest.setup.ts), with the store-visit
// columns applied (migration 20260926090000).
const created: string[] = [];

async function makeUndecidedItem(userId: string, createdAt: Date = new Date()) {
  const item = await prisma.desiredItem.create({
    data: {
      userId,
      sourceType: "typed",
      itemName: "Store visit test item",
      price: 100,
      userConfirmed: true,
      pauseStatus: "proceeded",
      decisionOutcome: "proceeded",
      createdAt,
    },
  });
  created.push(item.id);
  await recordStoreVisit(item.id, userId, new Date());
  await setStoreVisitAnswer(item.id, userId, "not_sure");
  return item;
}

afterEach(async () => {
  await prisma.desiredItem.deleteMany({ where: { id: { in: created.splice(0) } } });
});

describe("undecided store visits ('Not sure yet')", () => {
  it("are listed for the user who answered not_sure", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await makeUndecidedItem(user.id);
    const undecided = await listUndecidedVisits(user.id);
    expect(undecided.map((u) => u.id)).toContain(item.id);
  });

  it("are not listed for another user", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await makeUndecidedItem(user.id);
    const undecided = await listUndecidedVisits("00000000-0000-0000-0000-000000000000");
    expect(undecided.map((u) => u.id)).not.toContain(item.id);
  });

  it("are excluded from the Kept total, which counts dropped items only", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const before = await getKeptSummary(user.id, "all_time");
    await makeUndecidedItem(user.id);
    const after = await getKeptSummary(user.id, "all_time");
    expect(after).toEqual(before);
  });

  it("are untouched by the 60-day sweep, even when old enough to be swept", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const longAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    const item = await makeUndecidedItem(user.id, longAgo);
    await sweepStaleSavedItems(user.id);
    const row = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(row.pauseStatus).toBe("proceeded");
    expect(row.decisionOutcome).toBe("proceeded");
    expect(row.letGoAutomatically).toBe(false);
    expect(row.storeVisitAnswer).toBe("not_sure");
  });

  it("are asked again on the next visit: 'Go to' clears the answer and drops it from the list", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await makeUndecidedItem(user.id);
    expect(shouldAskDidYouBuy(await getStoreVisitState(item.id, user.id))).toBe(false);

    await recordStoreVisit(item.id, user.id, new Date());

    expect(shouldAskDidYouBuy(await getStoreVisitState(item.id, user.id))).toBe(true);
    const undecided = await listUndecidedVisits(user.id);
    expect(undecided.map((u) => u.id)).not.toContain(item.id);
  });

  it("round-trip through the generated client's new fields", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await makeUndecidedItem(user.id);
    const row = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(row.wentToStoreAt).toBeInstanceOf(Date);
    expect(row.storeVisitAnswer).toBe("not_sure");
  });
});

describe("store-visit queries are scoped by userId", () => {
  const otherUser = "00000000-0000-0000-0000-000000000000";

  it("another user's id can neither read, record, nor answer a visit", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await makeUndecidedItem(user.id);

    await expect(getStoreVisitState(item.id, otherUser)).resolves.toBeNull();

    await recordStoreVisit(item.id, otherUser, new Date());
    await setStoreVisitAnswer(item.id, otherUser, "bought");

    const row = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(row.storeVisitAnswer).toBe("not_sure");
  });
});
