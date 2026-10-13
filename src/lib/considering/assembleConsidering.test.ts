import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { assembleConsidering } from "./assembleConsidering";

// Every assembleConsidering call makes several raw-SQL round trips (see
// consideringMeta.ts) that currently fail (the migration isn't applied
// yet) and are caught - each failure is a real, slow network round trip to
// Neon, so these need a longer-than-default test timeout.
const SLOW_TEST_TIMEOUT = 60_000;

describe("assembleConsidering", () => {
  const desiredItemIds: string[] = [];
  const wardrobeItemIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: desiredItemIds } } });
    await prisma.wardrobeItem.deleteMany({ where: { id: { in: wardrobeItemIds } } });
    desiredItemIds.length = 0;
    wardrobeItemIds.length = 0;
  });

  it(
    "lists a waiting item under onPause, falling back to createdAt for the paused date",
    async () => {
      const user = await prisma.user.findFirstOrThrow();
      const item = await prisma.desiredItem.create({
        data: {
          userId: user.id,
          sourceType: "typed",
          itemName: "Navy Coat",
          userConfirmed: true,
          pauseStatus: "waiting",
          waitUntil: new Date("2099-01-01"),
          createdAt: new Date("2026-09-01"),
        },
      });
      desiredItemIds.push(item.id);

      const payload = await assembleConsidering(user.id, new Date("2026-09-05"));

      expect(payload.onPause).toHaveLength(1);
      expect(payload.onPause[0].item.id).toBe(item.id);
      expect(payload.onPause[0].pausedAt).toEqual(new Date("2026-09-01"));
      expect(payload.onPause[0].reflectionSummary).toBeNull();
    },
    SLOW_TEST_TIMEOUT
  );

  it(
    "lists a saved_for_later item under saved, computing days-ago from createdAt",
    async () => {
      const user = await prisma.user.findFirstOrThrow();
      const item = await prisma.desiredItem.create({
        data: {
          userId: user.id,
          sourceType: "typed",
          itemName: "Wishlist Bag",
          userConfirmed: true,
          pauseStatus: "saved_for_later",
          createdAt: new Date("2026-08-01"),
        },
      });
      desiredItemIds.push(item.id);

      const payload = await assembleConsidering(user.id, new Date("2026-09-05"));

      const row = payload.saved.find((r) => r.item.id === item.id);
      expect(row).toBeDefined();
      expect(row!.savedDaysAgo).toBe(35);
    },
    SLOW_TEST_TIMEOUT
  );

  it(
    "excludes proceeded and pending_confirmation items from both lists",
    async () => {
      const user = await prisma.user.findFirstOrThrow();
      const proceeded = await prisma.desiredItem.create({
        data: { userId: user.id, sourceType: "typed", itemName: "Bought Item", pauseStatus: "proceeded" },
      });
      const pending = await prisma.desiredItem.create({
        data: { userId: user.id, sourceType: "typed", itemName: "Untouched Item" },
      });
      desiredItemIds.push(proceeded.id, pending.id);

      const payload = await assembleConsidering(user.id);

      const ids = [...payload.onPause.map((r) => r.item.id), ...payload.saved.map((r) => r.item.id)];
      expect(ids).not.toContain(proceeded.id);
      expect(ids).not.toContain(pending.id);
    },
    SLOW_TEST_TIMEOUT
  );

  it(
    "reports letGo totals matching the existing kept summary",
    async () => {
      const user = await prisma.user.findFirstOrThrow();
      const dropped = await prisma.desiredItem.create({
        data: {
          userId: user.id,
          sourceType: "typed",
          itemName: "Let Go Item",
          userConfirmed: true,
          price: "42.00",
          decisionOutcome: "dropped",
        },
      });
      desiredItemIds.push(dropped.id);

      const payload = await assembleConsidering(user.id);

      expect(payload.letGo.itemsLetGo).toBeGreaterThanOrEqual(1);
      expect(payload.letGo.totalKept).toBeGreaterThanOrEqual(42);
    },
    SLOW_TEST_TIMEOUT
  );
});
