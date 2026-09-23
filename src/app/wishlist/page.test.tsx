import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "@/lib/prisma";
import WishlistPage from "./page";

describe("WishlistPage", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("lists exactly the saved_for_later items, excluding other pause statuses", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;

    const saved = await prisma.desiredItem.create({
      data: { userId, sourceType: "typed", itemName: "Saved Sweater", pauseStatus: "saved_for_later" },
    });
    createdIds.push(saved.id);
    const proceeded = await prisma.desiredItem.create({
      data: { userId, sourceType: "typed", itemName: "Proceeded Coat", pauseStatus: "proceeded" },
    });
    createdIds.push(proceeded.id);
    const waiting = await prisma.desiredItem.create({
      data: { userId, sourceType: "typed", itemName: "Waiting Boots", pauseStatus: "waiting" },
    });
    createdIds.push(waiting.id);

    const element = await WishlistPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Saved Sweater");
    expect(html).not.toContain("Proceeded Coat");
    expect(html).not.toContain("Waiting Boots");
  });
});
