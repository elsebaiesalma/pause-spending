import crypto from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";

describe("data schema (integration, real database)", () => {
  const testUserIds: string[] = [];

  afterAll(async () => {
    if (testUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
    await prisma.$disconnect();
  });

  it("creates and reads a linked row in every table for a single user", async () => {
    const user = await prisma.user.create({ data: { email: `test-${crypto.randomUUID()}@pause-spending.test` } });
    testUserIds.push(user.id);

    const emailConnection = await prisma.emailConnection.create({
      data: {
        userId: user.id,
        provider: "gmail",
        encryptedToken: { iv: "test-iv", tag: "test-tag", ciphertext: "test-ciphertext" },
        status: "connected",
      },
    });

    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        sourceEmailConnectionId: emailConnection.id,
        merchant: "Test Retailer",
        orderDate: new Date("2026-01-15"),
        itemName: "Navy Blazer",
        price: "89.99",
        category: "clothing",
        status: "active",
      },
    });

    const wardrobeItem = await prisma.wardrobeItem.create({
      data: {
        userId: user.id,
        sourcePurchaseId: purchase.id,
        itemName: "Navy Blazer",
        category: "clothing",
        colorName: "navy",
        colorFamily: "navy",
        styleTags: ["business-casual"],
        useCaseTags: ["work"],
        status: "active",
      },
    });

    const desiredItem = await prisma.desiredItem.create({
      data: {
        userId: user.id,
        sourceType: "typed",
        rawInput: "navy blazer",
        userConfirmed: false,
        pauseStatus: "pending_confirmation",
      },
    });

    const budget = await prisma.budget.create({
      data: {
        userId: user.id,
        month: "2026-01",
        amount: "200",
        categoryScope: "clothing_shoes_accessories",
      },
    });

    expect(emailConnection.userId).toBe(user.id);
    expect(purchase.merchant).toBe("Test Retailer");
    expect(wardrobeItem.sourcePurchaseId).toBe(purchase.id);
    expect(desiredItem.pauseStatus).toBe("pending_confirmation");
    expect(budget.amount.toString()).toBe("200");

    const reloadedWardrobeItem = await prisma.wardrobeItem.findUniqueOrThrow({
      where: { id: wardrobeItem.id },
    });
    expect(reloadedWardrobeItem.styleTags).toEqual(["business-casual"]);
  });

  it("rejects a row referencing a non-existent user_id", async () => {
    await expect(
      prisma.purchase.create({
        data: {
          userId: "00000000-0000-0000-0000-000000000000",
          merchant: "Test",
          orderDate: new Date(),
          itemName: "Test",
          price: "10",
          category: "clothing",
        },
      })
    ).rejects.toThrow();
  });

  it("cascade-deletes a user's rows when the user is deleted", async () => {
    const user = await prisma.user.create({ data: { email: `test-${crypto.randomUUID()}@pause-spending.test` } });

    const wardrobeItem = await prisma.wardrobeItem.create({
      data: { userId: user.id, itemName: "Test Item", status: "active" },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const found = await prisma.wardrobeItem.findUnique({ where: { id: wardrobeItem.id } });
    expect(found).toBeNull();
  });
});
