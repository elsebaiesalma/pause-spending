import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listWaitingQueue } from "./waitQueue";

describe("listWaitingQueue", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  async function makeItem(overrides: {
    itemName: string;
    pauseStatus: string;
    waitUntil?: Date | null;
  }) {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const item = await prisma.desiredItem.create({
      data: {
        userId,
        sourceType: "typed",
        itemName: overrides.itemName,
        userConfirmed: true,
        pauseStatus: overrides.pauseStatus,
        waitUntil: overrides.waitUntil ?? null,
      },
    });
    createdIds.push(item.id);
    return item;
  }

  it("separates elapsed items from still-waiting ones", async () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const elapsedItem = await makeItem({
      itemName: "Elapsed Item",
      pauseStatus: "waiting",
      waitUntil: new Date("2026-06-15T00:00:00Z"),
    });
    const stillWaitingItem = await makeItem({
      itemName: "Still Waiting Item",
      pauseStatus: "waiting",
      waitUntil: new Date("2026-06-20T00:00:00Z"),
    });
    const userId = elapsedItem.userId;

    const queue = await listWaitingQueue(userId, now);

    expect(queue.elapsed.map((i) => i.id)).toEqual([elapsedItem.id]);
    expect(queue.stillWaiting.map((i) => i.id)).toEqual([stillWaitingItem.id]);
  });

  it("treats a wait_until exactly at now as elapsed", async () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const item = await makeItem({ itemName: "Right Now", pauseStatus: "waiting", waitUntil: now });

    const queue = await listWaitingQueue(item.userId, now);

    expect(queue.elapsed.map((i) => i.id)).toEqual([item.id]);
  });

  it("excludes items that were never put into the waiting state", async () => {
    const item = await makeItem({ itemName: "Pending", pauseStatus: "pending_confirmation" });

    const queue = await listWaitingQueue(item.userId, new Date());

    expect(queue.elapsed).toEqual([]);
    expect(queue.stillWaiting).toEqual([]);
  });

  it("contains no email/push notification code path - waiting is in-app only, surfaced by the queue query alone", () => {
    const source = readFileSync(new URL("./waitQueue.ts", import.meta.url), "utf8");
    const codeOnly = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(codeOnly).not.toMatch(/sendemail|notification|nodemailer|sendgrid|twilio|webpush/i);
  });
});
