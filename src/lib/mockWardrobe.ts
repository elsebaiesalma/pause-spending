import { createHash } from "node:crypto";
import { z } from "zod";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import { CATEGORIES } from "@/lib/wardrobeView";

// The mock wardrobe: pure parsing and row-building, with no database. The
// scripts and the tests share it. The data lives in data/mock-wardrobe.json
// and its images in public/mock/ (see the README there).

export const MOCK_SOURCE = "seed";

// Not a secret: just a fixed namespace so the same key and user always give
// the same ids. Re-running the seed then finds its own rows and updates them,
// and two accounts never share a row.
const NAMESPACE = "6f1e2d3c-4b5a-4c7d-8e9f-0a1b2c3d4e5f";

const colorFamilySchema = z.enum(COLOR_FAMILIES);
const categorySchema = z.enum(CATEGORIES.map((c) => c.key) as [string, ...string[]]);

export const mockItemSchema = z.object({
  // A short stable slug. It is the row's identity: change it and the item is a new one.
  key: z.string().regex(/^[a-z0-9-]+$/),
  brand: z.string().min(1),
  // The name WITHOUT the brand; the brand is prefixed when the row is built,
  // the way a retailer's order email would have it.
  name: z.string().min(1),
  category: categorySchema,
  colorFamily: colorFamilySchema,
  colorName: z.string().min(1),
  // Canadian dollars. Null means the price is unknown.
  price: z.number().positive().nullable(),
  purchasedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z.array(z.string().min(1)).min(1),
  // A file in public/mock, or null for the designed placeholder card.
  image: z
    .string()
    .regex(/^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/)
    .nullable(),
  // Shows up as an item that still needs a human look.
  needsReview: z.boolean().optional(),
});

export type MockItem = z.infer<typeof mockItemSchema>;

export const mockWardrobeSchema = z
  .array(mockItemSchema)
  .refine((items) => new Set(items.map((i) => i.key)).size === items.length, { message: "duplicate key" });

export function parseMockWardrobe(raw: unknown): MockItem[] {
  return mockWardrobeSchema.parse(raw);
}

// RFC 4122 version 5 (name-based, SHA-1) UUID.
export function uuidV5(name: string, namespace: string = NAMESPACE): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(name).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function mockIds(key: string, userId: string): { purchaseId: string; wardrobeItemId: string } {
  return { purchaseId: uuidV5(`purchase:${userId}:${key}`), wardrobeItemId: uuidV5(`wardrobe:${userId}:${key}`) };
}

export const MOCK_IMAGE_BASE = "/mock/";

// The two rows one mock item becomes: the purchase it supposedly came from
// (which carries the brand and price, as real synced items do) and the
// wardrobe item itself.
export function buildRows(item: MockItem, userId: string, imageExists: (file: string) => boolean) {
  const { purchaseId, wardrobeItemId } = mockIds(item.key, userId);
  const fullName = `${item.brand} ${item.name}`;
  const imageUrl = item.image && imageExists(item.image) ? `${MOCK_IMAGE_BASE}${item.image}` : null;
  const purchaseDate = new Date(`${item.purchasedAt}T00:00:00.000Z`);

  return {
    purchaseId,
    wardrobeItemId,
    imageUrl,
    purchase: {
      userId,
      merchant: item.brand,
      orderDate: purchaseDate,
      itemName: fullName,
      price: item.price,
      category: item.category,
      imageUrl,
      colorName: item.colorName,
      colorFamily: item.colorFamily,
      // The real ingestion rule: a purchase with no price is always a review draft.
      status: item.price === null ? "needs_review" : "active",
      source: MOCK_SOURCE,
    },
    wardrobeItem: {
      userId,
      sourcePurchaseId: purchaseId,
      itemName: fullName,
      imageUrl,
      category: item.category,
      colorName: item.colorName,
      colorFamily: item.colorFamily,
      styleTags: item.tags,
      ownedSince: purchaseDate,
      status: item.needsReview ? "needs_review" : "active",
      source: MOCK_SOURCE,
    },
  };
}
