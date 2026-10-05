import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listLetGoItems } from "./letGoList";

// listLetGoItems makes a raw-SQL round trip (see consideringMeta.ts) that
// currently fails (the migration isn't applied yet) and is caught - a
// real, slow network round trip to Neon, so these need a
// longer-than-default test timeout.
const SLOW_TEST_TIMEOUT = 30_000;

describe("listLetGoItems", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it(
    "includes a dropped item with a confirmed price",
    async () => {
      const user = await prisma.user.findFirstOrThrow();
      const item = await prisma.desiredItem.create({
        data: {
          userId: user.id,
          sourceType: "typed",
          itemName: "Dropped Coat",
          userConfirmed: true,
          price: "80.00",
          decisionOutcome: "dropped",
        },
      });
      createdIds.push(item.id);

      const rows = await listLetGoItems(user.id);

      const row = rows.find((r) => r.item.id === item.id);
      expect(row).toBeDefined();
      expect(row!.automatic).toBe(false);
    },
    SLOW_TEST_TIMEOUT
  );

  it(
    "excludes a dropped item with no confirmed price",
    async () => {
      const user = await prisma.user.findFirstOrThrow();
      const item = await prisma.desiredItem.create({
        data: {
          userId: user.id,
          sourceType: "typed",
          itemName: "Unpriced Dropped Item",
          userConfirmed: false,
          decisionOutcome: "dropped",
        },
      });
      createdIds.push(item.id);

      const rows = await listLetGoItems(user.id);

      expect(rows.some((r) => r.item.id === item.id)).toBe(false);
    },
    SLOW_TEST_TIMEOUT
  );

  it(
    "excludes an item that was bought after all (decisionOutcome proceeded)",
    async () => {
      const user = await prisma.user.findFirstOrThrow();
      const item = await prisma.desiredItem.create({
        data: {
          userId: user.id,
          sourceType: "typed",
          itemName: "Bought After All",
          userConfirmed: true,
          price: "60.00",
          decisionOutcome: "proceeded",
        },
      });
      createdIds.push(item.id);

      const rows = await listLetGoItems(user.id);

      expect(rows.some((r) => r.item.id === item.id)).toBe(false);
    },
    SLOW_TEST_TIMEOUT
  );
});
