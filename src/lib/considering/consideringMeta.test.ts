import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getConsideringMeta,
  markPaused,
  sweepEndedPauses,
  markSaved,
  markLetGo,
  sweepStaleSavedItems,
} from "./consideringMeta";

describe("consideringMeta (migration 20260925100000 applied)", () => {
  it("getConsideringMeta returns {} for ids with no row", async () => {
    await expect(getConsideringMeta(["00000000-0000-0000-0000-000000000000"])).resolves.toEqual({});
  });

  it("getConsideringMeta returns {} immediately for an empty id list, without a query", async () => {
    await expect(getConsideringMeta([])).resolves.toEqual({});
  });

  // Split into one `it` per function (rather than one test calling all
  // three) so each gets its own full test timeout - each call is a real,
  // slow round trip to Neon that fails with a genuine driver error, and all
  // three sequentially can exceed a single test's budget.
  it("markPaused degrades to a no-op rather than throwing", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Test Item" },
    });
    try {
      await expect(markPaused(item.id, user.id, new Date())).resolves.toBeUndefined();
    } finally {
      await prisma.desiredItem.deleteMany({ where: { id: item.id } });
    }
  });

  it("markSaved degrades to a no-op rather than throwing", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Test Item" },
    });
    try {
      await expect(markSaved(item.id, user.id, new Date())).resolves.toBeUndefined();
    } finally {
      await prisma.desiredItem.deleteMany({ where: { id: item.id } });
    }
  });

  it("markLetGo degrades to a no-op rather than throwing", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Test Item" },
    });
    try {
      await expect(markLetGo(item.id, user.id, true, new Date())).resolves.toBeUndefined();
    } finally {
      await prisma.desiredItem.deleteMany({ where: { id: item.id } });
    }
  });

  it("sweepStaleSavedItems moves a stale saved item to let go, as an automatic drop", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: {
        userId: user.id,
        sourceType: "typed",
        itemName: "Old Saved Item",
        pauseStatus: "saved_for_later",
        createdAt: new Date("2020-01-01"),
      },
    });

    try {
      await expect(sweepStaleSavedItems(user.id)).resolves.toBeUndefined();
      const swept = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
      // Same end state as a user's "Let it go" (pauseStatus proceeded,
      // decisionOutcome dropped), flagged as automatic.
      expect(swept.pauseStatus).toBe("proceeded");
      expect(swept.decisionOutcome).toBe("dropped");
      expect(swept.letGoAutomatically).toBe(true);
    } finally {
      await prisma.desiredItem.deleteMany({ where: { id: item.id } });
    }
  });
});

describe("sweepEndedPauses (pauses end silently)", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = new Date("2026-10-14T12:00:00Z");
  const created: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: created.splice(0) } } });
  });

  async function waitingItem(overrides: Record<string, unknown>) {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: {
        userId: user.id,
        sourceType: "typed",
        itemName: "Paused Item",
        userConfirmed: true,
        pauseStatus: "waiting",
        ...overrides,
      },
    });
    created.push(item.id);
    return { user, item };
  }

  async function savedAt(id: string): Promise<Date | null> {
    const rows = await prisma.$queryRaw<{ saved_at: Date | null }[]>`SELECT "saved_at" FROM "desired_items" WHERE "id" = ${id}::uuid`;
    return rows[0].saved_at;
  }

  it("moves an ended pause to Undecided (saved for later), leaving a pause still running alone", async () => {
    const ended = await waitingItem({ waitUntil: new Date(NOW.getTime() - DAY) });
    const running = await waitingItem({ waitUntil: new Date(NOW.getTime() + DAY) });

    const moved = await sweepEndedPauses(ended.user.id, NOW);

    expect(moved).toContain(ended.item.id);
    expect(moved).not.toContain(running.item.id);
    expect((await prisma.desiredItem.findUniqueOrThrow({ where: { id: ended.item.id } })).pauseStatus).toBe("saved_for_later");
    expect((await prisma.desiredItem.findUniqueOrThrow({ where: { id: running.item.id } })).pauseStatus).toBe("waiting");
  }, 30_000);

  it("starts the 60-day clock when the pause ended, not at the original save or at the sweep", async () => {
    const waitUntil = new Date(NOW.getTime() - 3 * DAY);
    const { user, item } = await waitingItem({ waitUntil });
    // The item had been saved long ago, then paused again.
    await markSaved(item.id, user.id, new Date(NOW.getTime() - 100 * DAY));
    await prisma.desiredItem.update({ where: { id: item.id }, data: { pauseStatus: "waiting" } });

    await sweepEndedPauses(user.id, NOW);

    expect((await savedAt(item.id))?.getTime()).toBe(waitUntil.getTime());
    // 3 days into its 60: the existing auto-move must leave it alone.
    await sweepStaleSavedItems(user.id, NOW);
    expect((await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } })).pauseStatus).toBe("saved_for_later");
  }, 30_000);

  it("applies the existing auto-move to Let go once 60 days have passed since the pause ended", async () => {
    const { user, item } = await waitingItem({ waitUntil: new Date(NOW.getTime() - 61 * DAY) });

    await sweepEndedPauses(user.id, NOW);
    await sweepStaleSavedItems(user.id, NOW);

    const after = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(after.decisionOutcome).toBe("dropped");
    expect(after.letGoAutomatically).toBe(true);
  }, 30_000);

  it("changes nothing but the move: no price or outcome change, and no other rows or notices", async () => {
    const { user, item } = await waitingItem({ waitUntil: new Date(NOW.getTime() - DAY), price: "80" });
    const [purchasesBefore, wardrobeBefore] = await Promise.all([
      prisma.purchase.count({ where: { userId: user.id } }),
      prisma.wardrobeItem.count({ where: { userId: user.id } }),
    ]);

    await sweepEndedPauses(user.id, NOW);

    const after = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(Number(after.price)).toBe(80);
    expect(after.decisionOutcome).toBeNull();
    expect(after.waitUntil).toEqual(item.waitUntil);
    // There is no notification table at all; nothing else was written.
    expect(await prisma.purchase.count({ where: { userId: user.id } })).toBe(purchasesBefore);
    expect(await prisma.wardrobeItem.count({ where: { userId: user.id } })).toBe(wardrobeBefore);
  }, 30_000);

  it("never touches another user's paused item", async () => {
    const mine = await waitingItem({ waitUntil: new Date(NOW.getTime() - DAY) });
    const other = await prisma.user.create({ data: { email: `sweep-${Date.now()}@pause-spending.test` } });
    try {
      const theirs = await prisma.desiredItem.create({
        data: { userId: other.id, sourceType: "typed", itemName: "Theirs", pauseStatus: "waiting", waitUntil: new Date(NOW.getTime() - DAY) },
      });
      created.push(theirs.id);

      await sweepEndedPauses(mine.user.id, NOW);

      expect((await prisma.desiredItem.findUniqueOrThrow({ where: { id: theirs.id } })).pauseStatus).toBe("waiting");
    } finally {
      await prisma.desiredItem.deleteMany({ where: { userId: other.id } });
      await prisma.user.delete({ where: { id: other.id } });
    }
  }, 30_000);
});
