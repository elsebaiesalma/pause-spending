import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gmail/fetchMessages", () => ({
  getMessageBody: vi.fn(),
}));

vi.mock("./llmExtractor", () => ({
  extractPurchaseItems: vi.fn(),
}));

vi.mock("@/lib/emailClassification/classifyEmailType", () => ({
  classifyEmailType: vi.fn(),
}));

vi.mock("./imageBranding", () => ({
  isReusedBrandingImage: vi.fn(),
}));

// Tagging behavior is covered by tagWardrobeItem.test.ts - here it's just
// a pass-through so this doesn't make real LLM calls.
vi.mock("@/lib/tagging/tagWardrobeItem", () => ({
  ensureWardrobeItemTagged: vi.fn(async (item) => item),
}));

import { getMessageBody } from "@/lib/gmail/fetchMessages";
import { extractPurchaseItems } from "./llmExtractor";
import { classifyEmailType } from "@/lib/emailClassification/classifyEmailType";
import { isReusedBrandingImage } from "./imageBranding";
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

    // Default for every test that doesn't care about type gating itself -
    // behaves like the old "everything in scope gets extracted" world.
    vi.mocked(classifyEmailType).mockResolvedValue("order_confirmation");
    vi.mocked(isReusedBrandingImage).mockResolvedValue(false);
  });

  afterEach(async () => {
    vi.mocked(getMessageBody).mockReset();
    vi.mocked(extractPurchaseItems).mockReset();
    vi.mocked(classifyEmailType).mockReset();
    vi.mocked(isReusedBrandingImage).mockReset();
    // Cascades to any purchases created against this connection.
    await prisma.emailConnection.deleteMany({ where: { id: connectionId } });
  });

  it("creates an active purchase row for a confident extraction, with the expected fields", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Nike",
      orderReference: null,
      subtotal: null,
      confident: true,
      items: [
        {
          itemName: "Air Max 90",
          price: 129.99,
          category: "shoes",
          imageUrl: "https://cdn.nike.com/products/shoe.jpg",
          productLink: null,
        },
      ],
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

  it("persists the product page link the model matched to this item", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Nike",
      orderReference: null,
      subtotal: null,
      confident: true,
      items: [
        {
          itemName: "Air Max 90",
          price: 129.99,
          category: "shoes",
          imageUrl: "https://cdn.nike.com/products/shoe.jpg",
          productLink: "https://nike.com/products/air-max-90",
        },
      ],
    });

    const message = buildMessage({ id: "msg-with-link" });
    await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

    const purchase = await prisma.purchase.findFirstOrThrow({ where: { sourceEmailId: message.id } });
    expect(purchase.imageUrl).toBe("https://cdn.nike.com/products/shoe.jpg");
    expect(purchase.productLink).toBe("https://nike.com/products/air-max-90");
  });

  it("passes the email's image candidates through to the LLM extraction call", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce(
      '<a href="https://nike.com/products/air-max-90"><img src="https://cdn.nike.com/products/shoe.jpg"></a>'
    );
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Nike",
      orderReference: null,
      subtotal: null,
      confident: true,
      items: [
        { itemName: "Air Max 90", price: 129.99, category: "shoes", imageUrl: null, productLink: null },
      ],
    });

    const message = buildMessage({ id: "msg-candidates" });
    await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

    expect(extractPurchaseItems).toHaveBeenCalledWith(
      expect.objectContaining({ from: message.from, subject: message.subject }),
      [{ imageUrl: "https://cdn.nike.com/products/shoe.jpg", productLink: "https://nike.com/products/air-max-90" }]
    );
  });

  it("gives each item in a multi-item order its own matched image, not one shared image for all", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Zara",
      orderReference: null,
      subtotal: null,
      confident: true,
      items: [
        {
          itemName: "Wool Coat",
          price: 199,
          category: "outerwear",
          imageUrl: "https://cdn.zara.com/coat.jpg",
          productLink: null,
        },
        {
          itemName: "Silk Scarf",
          price: 39,
          category: "accessories",
          imageUrl: "https://cdn.zara.com/scarf.jpg",
          productLink: null,
        },
      ],
    });

    const message = buildMessage({ id: "msg-multi" });
    await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

    const purchases = await prisma.purchase.findMany({ where: { sourceEmailId: message.id } });
    expect(purchases).toHaveLength(2);
    expect(purchases.map((p) => p.itemName).sort()).toEqual(["Silk Scarf", "Wool Coat"]);
    const coat = purchases.find((p) => p.itemName === "Wool Coat");
    const scarf = purchases.find((p) => p.itemName === "Silk Scarf");
    expect(coat?.imageUrl).toBe("https://cdn.zara.com/coat.jpg");
    expect(scarf?.imageUrl).toBe("https://cdn.zara.com/scarf.jpg");

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
      subtotal: null,
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
    expect(purchase.price).toBeNull();

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
      subtotal: null,
      confident: true,
      items: [{ itemName: "Air Max 90", price: 129.99, category: "shoes", imageUrl: null, productLink: null }],
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
      subtotal: null,
      confident: true,
      items: [{ itemName: "Wool Coat", price: 450, category: "outerwear", imageUrl: null, productLink: null }],
    });
    const confirmationMessage = buildMessage({ id: "msg-confirmation" });
    await extractAndPersistPurchase({
      accessToken: "fake-token",
      userId,
      connectionId,
      message: confirmationMessage,
    });

    // A duplicate confirmation-typed email for the same order (e.g. a
    // separate "receipt" email) - classifyEmailType still says
    // order_confirmation, but the merchant+orderReference dedup must catch it.
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html>Your receipt.</html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      subtotal: null,
      confident: false,
      items: [],
    });
    const receiptMessage = buildMessage({
      id: "msg-receipt",
      subject: "Your Holt Renfrew receipt, order 30688409",
    });
    await extractAndPersistPurchase({
      accessToken: "fake-token",
      userId,
      connectionId,
      message: receiptMessage,
    });

    const allForOrder = await prisma.purchase.findMany({
      where: { userId, merchant: "Holt Renfrew", orderReference: "30688409" },
    });
    expect(allForOrder).toHaveLength(1);
    expect(allForOrder[0].status).toBe("active");
    expect(allForOrder[0].sourceEmailId).toBe("msg-confirmation");
  });

  it("upgrades an earlier needs_review placeholder once a later confirmation-typed email reveals the order's real items", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html>Thank you for your order.</html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      subtotal: null,
      confident: false,
      items: [],
    });
    const firstConfirmation = buildMessage({
      id: "msg-first",
      subject: "Order 30688409 confirmed",
    });
    await extractAndPersistPurchase({
      accessToken: "fake-token",
      userId,
      connectionId,
      message: firstConfirmation,
    });

    const placeholder = await prisma.purchase.findFirstOrThrow({
      where: { userId, merchant: "Holt Renfrew", orderReference: "30688409" },
    });
    expect(placeholder.status).toBe("needs_review");

    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      subtotal: null,
      confident: true,
      items: [{ itemName: "Wool Coat", price: 450, category: "outerwear", imageUrl: null, productLink: null }],
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

  it("never deletes/replaces a row the user has already hand-corrected, even if it's still needs_review", async () => {
    vi.mocked(getMessageBody).mockResolvedValueOnce("<html>Thank you for your order.</html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      subtotal: null,
      confident: false,
      items: [],
    });
    const firstConfirmation = buildMessage({
      id: "msg-first-edited",
      subject: "Order 30688409 confirmed",
    });
    await extractAndPersistPurchase({
      accessToken: "fake-token",
      userId,
      connectionId,
      message: firstConfirmation,
    });

    const placeholder = await prisma.purchase.findFirstOrThrow({
      where: { userId, merchant: "Holt Renfrew", orderReference: "30688409" },
    });
    // Simulates a hand correction that, for whatever reason, didn't also
    // flip status to active - userEdited alone must be enough to protect it.
    await prisma.purchase.update({ where: { id: placeholder.id }, data: { userEdited: true } });

    vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
    vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
      merchant: "Holt Renfrew",
      orderReference: "30688409",
      subtotal: null,
      confident: true,
      items: [{ itemName: "Different Item", price: 999, category: "outerwear", imageUrl: null, productLink: null }],
    });
    const confirmationMessage = buildMessage({ id: "msg-confirmation-after-edit" });
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
    expect(allForOrder[0].id).toBe(placeholder.id);
    expect(allForOrder[0].userEdited).toBe(true);
  });

  describe("email-type gating", () => {
    it.each(["shipping", "delivered", "return", "refund", "promo", "other"] as const)(
      "never creates a purchase or fetches the body for a %s-typed email",
      async (type) => {
        vi.mocked(classifyEmailType).mockResolvedValueOnce(type);

        const message = buildMessage({ id: `msg-${type}` });
        await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

        expect(getMessageBody).not.toHaveBeenCalled();
        expect(extractPurchaseItems).not.toHaveBeenCalled();
        const purchases = await prisma.purchase.findMany({ where: { sourceEmailId: message.id } });
        expect(purchases).toHaveLength(0);
      }
    );

    it("still creates a purchase for an order_confirmation-typed email", async () => {
      vi.mocked(classifyEmailType).mockResolvedValueOnce("order_confirmation");
      vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
      vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
        merchant: "Nike",
        orderReference: null,
        subtotal: null,
        confident: true,
        items: [{ itemName: "Air Max 90", price: 129.99, category: "shoes", imageUrl: null, productLink: null }],
      });

      const message = buildMessage({ id: "msg-confirmation-type" });
      await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

      const purchases = await prisma.purchase.findMany({ where: { sourceEmailId: message.id } });
      expect(purchases).toHaveLength(1);
      expect(purchases[0].status).toBe("active");
    });
  });

  describe("order reference fallback", () => {
    it("derives the order number from the subject when the LLM didn't find one, and uses it for dedup", async () => {
      vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
      vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
        merchant: "Revolve",
        orderReference: null,
        subtotal: null,
        confident: true,
        items: [{ itemName: "Wool Coat", price: 199, category: "outerwear", imageUrl: null, productLink: null }],
      });

      const message = buildMessage({
        id: "msg-subject-order-number",
        subject: "Your order #374003606 has been processed",
      });
      await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

      const purchase = await prisma.purchase.findFirstOrThrow({ where: { sourceEmailId: message.id } });
      expect(purchase.orderReference).toBe("374003606");
    });
  });

  describe("per-item price handling", () => {
    it("creates a needs_review row (not active) for an item whose price is null, while sibling items with a real price still go active", async () => {
      vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
      vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
        merchant: "Revolve",
        orderReference: null,
        subtotal: null,
        confident: true,
        items: [
          { itemName: "Wool Coat", price: 199, category: "outerwear", imageUrl: null, productLink: null },
          { itemName: "Ambiguous Item", price: null, category: "accessories", imageUrl: null, productLink: null },
        ],
      });

      const message = buildMessage({ id: "msg-mixed-price" });
      await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

      const purchases = await prisma.purchase.findMany({ where: { sourceEmailId: message.id } });
      const coat = purchases.find((p) => p.itemName === "Wool Coat");
      const ambiguous = purchases.find((p) => p.itemName === "Ambiguous Item");
      expect(coat?.status).toBe("active");
      expect(Number(coat?.price)).toBeCloseTo(199);
      expect(ambiguous?.status).toBe("needs_review");
      expect(ambiguous?.price).toBeNull();

      const wardrobeItems = await prisma.wardrobeItem.findMany({
        where: { sourcePurchaseId: { in: purchases.map((p) => p.id) } },
      });
      expect(wardrobeItems).toHaveLength(1);
      expect(wardrobeItems[0].itemName).toBe("Wool Coat");
    });
  });

  describe("branding-image reuse", () => {
    it("nulls out an item's image when it's already used by another purchase from the same merchant", async () => {
      vi.mocked(isReusedBrandingImage).mockResolvedValueOnce(true);
      vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
      vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
        merchant: "Revolve",
        orderReference: null,
        subtotal: null,
        confident: true,
        items: [
          {
            itemName: "Wool Coat",
            price: 199,
            category: "outerwear",
            imageUrl: "https://cdn.revolve.com/shared-header.png",
            productLink: null,
          },
        ],
      });

      const message = buildMessage({ id: "msg-branding" });
      await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

      const purchase = await prisma.purchase.findFirstOrThrow({ where: { sourceEmailId: message.id } });
      expect(purchase.imageUrl).toBeNull();
      expect(isReusedBrandingImage).toHaveBeenCalledWith(
        userId,
        "Revolve",
        "https://cdn.revolve.com/shared-header.png",
        message.id
      );
    });

    it("keeps an item's image when it isn't reused elsewhere", async () => {
      vi.mocked(isReusedBrandingImage).mockResolvedValueOnce(false);
      vi.mocked(getMessageBody).mockResolvedValueOnce("<html></html>");
      vi.mocked(extractPurchaseItems).mockResolvedValueOnce({
        merchant: "Revolve",
        orderReference: null,
        subtotal: null,
        confident: true,
        items: [
          {
            itemName: "Wool Coat",
            price: 199,
            category: "outerwear",
            imageUrl: "https://cdn.revolve.com/products/coat.jpg",
            productLink: null,
          },
        ],
      });

      const message = buildMessage({ id: "msg-not-branding" });
      await extractAndPersistPurchase({ accessToken: "fake-token", userId, connectionId, message });

      const purchase = await prisma.purchase.findFirstOrThrow({ where: { sourceEmailId: message.id } });
      expect(purchase.imageUrl).toBe("https://cdn.revolve.com/products/coat.jpg");
    });
  });
});
