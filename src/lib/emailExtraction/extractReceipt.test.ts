import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gmail/fetchMessages", () => ({
  getMessageBody: vi.fn(),
}));

vi.mock("./llmExtractor", () => ({
  extractPurchaseItems: vi.fn(),
}));

import { getMessageBody } from "@/lib/gmail/fetchMessages";
import { extractPurchaseItems } from "./llmExtractor";
import { prisma } from "@/lib/prisma";
import { extractAndPersistPurchase } from "./extractReceipt";

function buildMessage(
  overrides: Partial<{
    id: string;
    from: string;
    subject: string;
    snippet: string;
    internalDate: string;
  }> = {}
) {
  return {
    id: "msg-1",
    from: "orders@nike.com",
    subject: "Your Nike Order Confirmation",
    snippet: "",
    internalDate: String(Date.parse("2026-03-01")),
    ...overrides,
  };
}

describe("extractAndPersistPurchase", () => {
  let userId: string;
  let connectionId: string;

  beforeEach(async () => {
    const user = await prisma.user.findFirstOrThrow();
    userId = user.id;
    const connection = await prisma.emailConnection.create({
      data: {
        userId,
        provider: "gmail-test-extract",
        encryptedToken: {},
        status: "connected",
      },
    });
    connectionId = connection.id;
  });

  afterEach(async () => {
    vi.mocked(getMessageBody).mockReset();
    vi.mocked(extractPurchaseItems).mockReset();
    // Cascades to any purchases created against this connection.
    await prisma.emailConnection.deleteMany({ where: { id: connectionId } });
  });

  it("creates an active purchase row for a confident extraction, with the expected fields", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce(
      '<html><img src="https://cdn.nike.com/products/shoe.jpg"></html>'
    );
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Nike",
      orderReference: null,
      confident: true,
      items: [{ itemName: "Air Max 90", price: 129.99, category: "shoes" }],
    });

    const message = buildMessage();
    await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

    const purchase = await prisma.purchase.findFirstOrThrow({
      where: { sourceEmailId: message.id },
    });
    expect(purchase.merchant).toBe("Nike");
    expect(purchase.itemName).toBe("Air Max 90");
    expect(Number(purchase.price)).toBeCloseTo(129.99);
    expect(purchase.category).toBe("shoes");
    expect(purchase.status).toBe("active");
    expect(purchase.imageUrl).toBe("https://cdn.nike.com/products/shoe.jpg");
    expect(purchase.orderDate.toISOString().slice(0, 10)).toBe("2026-03-01");

    const wardrobeItem = await prisma.wardrobeItem.findFirstOrThrow({
      where: { sourcePurchaseId: purchase.id },
    });
    expect(wardrobeItem.itemName).toBe("Air Max 90");
    expect(wardrobeItem.status).toBe("active");
  });

  it("creates one row per item for a multi-item order", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Zara",
      orderReference: null,
      confident: true,
      items: [
        { itemName: "Wool Coat", price: 199, category: "outerwear" },
        { itemName: "Silk Scarf", price: 39, category: "accessories" },
      ],
    });

    const message = buildMessage({ id: "msg-multi" });
    await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

    const purchases = await prisma.purchase.findMany({ where: { sourceEmailId: message.id } });
    expect(purchases).toHaveLength(2);
    expect(purchases.map((p) => p.itemName).sort()).toEqual(["Silk Scarf", "Wool Coat"]);

    const wardrobeItems = await prisma.wardrobeItem.findMany({
      where: { sourcePurchaseId: { in: purchases.map((p) => p.id) } },
    });
    expect(wardrobeItems).toHaveLength(2);
  });

  it("lands a low-confidence extraction in the review queue instead of creating a bad row", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html>Your package is on the way.</html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "UPS",
      orderReference: null,
      confident: false,
      items: [],
    });

    const message = buildMessage({ id: "msg-review", subject: "Your package is on the way" });
    await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

    const purchase = await prisma.purchase.findFirstOrThrow({
      where: { sourceEmailId: message.id },
    });
    expect(purchase.status).toBe("needs_review");
    expect(purchase.itemName).toBe("Your package is on the way");
    expect(Number(purchase.price)).toBe(0);

    const wardrobeItem = await prisma.wardrobeItem.findFirst({
      where: { sourcePurchaseId: purchase.id },
    });
    expect(wardrobeItem).toBeNull();
  });

  it("is idempotent - re-running extraction for an already-extracted email does not duplicate or re-fetch", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Nike",
      orderReference: null,
      confident: true,
      items: [{ itemName: "Air Max 90", price: 129.99, category: "shoes" }],
    });

    const message = buildMessage({ id: "msg-idempotent" });
    await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });
    await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

    const purchases = await prisma.purchase.findMany({ where: { sourceEmailId: message.id } });
    expect(purchases).toHaveLength(1);
    expect(getMessageBody).toHaveBeenCalledTimes(1);
  });

  it("skips a shipping-update email for an order already fully captured by an earlier confirmation email", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      confident: true,
      items: [{ itemName: "Wool Coat", price: 450, category: "outerwear" }],
    });
    const confirmationMessage = buildMessage({ id: "msg-confirmation" });
    await extractAndPersistPurchase({
      accessToken: "fake-token",
      userId,
      connectionId,
      message: confirmationMessage,
    });

    vi.mocked(getMessageBody).mockResolvedValueOnce("<html>Your order has shipped.</html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      confident: false,
      items: [],
    });
    const shippedMessage = buildMessage({
      id: "msg-shipped",
      subject: "Your Holt Renfrew Order 30688409 Has Been Shipped!",
    });
    await extractAndPersistPurchase({
      accessToken: "fake-token",
      userId,
      connectionId,
      message: shippedMessage,
    });

    const allForOrder = await prisma.purchase.findMany({
      where: { userId, merchant: "Holt Renfrew", orderReference: "30688409" },
    });
    expect(allForOrder).toHaveLength(1);
    expect(allForOrder[0].status).toBe("active");
    expect(allForOrder[0].sourceEmailId).toBe("msg-confirmation");
  });

  it("upgrades an earlier needs_review placeholder once a later email reveals the order's real items", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html>Your order has shipped.</html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      confident: false,
      items: [],
    });
    const shippedMessage = buildMessage({
      id: "msg-shipped-first",
      subject: "Your Holt Renfrew Order 30688409 Has Been Shipped!",
    });
    await extractAndPersistPurchase({
      accessToken: "fake-token",
      userId,
      connectionId,
      message: shippedMessage,
    });

    const placeholder = await prisma.purchase.findFirstOrThrow({
      where: { userId, merchant: "Holt Renfrew", orderReference: "30688409" },
    });
    expect(placeholder.status).toBe("needs_review");

    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      confident: true,
      items: [{ itemName: "Wool Coat", price: 450, category: "outerwear" }],
    });
    const confirmationMessage = buildMessage({ id: "msg-confirmation-second" });
    await extractAndPersistPurchase({
      accessToken: "fake-token",
      userId,
      connectionId,
      message: confirmationMessage,
    });

    const allForOrder = await prisma.purchase.findMany({
      where: { userId, merchant: "Holt Renfrew", orderReference: "30688409" },
    });
    expect(allForOrder).toHaveLength(1);
    expect(allForOrder[0].status).toBe("active");
    expect(allForOrder[0].itemName).toBe("Wool Coat");
  });
});
