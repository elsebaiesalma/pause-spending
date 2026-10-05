import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getConsideringMeta,
  markPaused,
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
