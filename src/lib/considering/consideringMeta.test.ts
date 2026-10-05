import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getConsideringMeta,
  markPaused,
  markSaved,
  markLetGo,
  sweepStaleSavedItems,
} from "./consideringMeta";

describe("consideringMeta (pending migration 20260925100000)", () => {
  it("getConsideringMeta returns {} rather than throwing, for a missing migration", async () => {
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

  it("sweepStaleSavedItems degrades to a no-op, leaving saved_for_later items untouched", async () => {
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
      const unchanged = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
      expect(unchanged.pauseStatus).toBe("saved_for_later");
    } finally {
      await prisma.desiredItem.deleteMany({ where: { id: item.id } });
    }
  });
});
