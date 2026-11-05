import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import { stripBrandPrefix } from "@/lib/wardrobeDisplay";
import { findClusters } from "@/lib/wardrobeClusters";
import { categoryKeyOf } from "@/lib/wardrobeView";
import { buildRows, mockIds, parseMockWardrobe, uuidV5, type MockItem } from "./mockWardrobe";

const raw = JSON.parse(readFileSync(path.join("data", "mock-wardrobe.json"), "utf8"));
const items = parseMockWardrobe(raw);
const readme = readFileSync(path.join("public", "mock", "README.md"), "utf8");

describe("data/mock-wardrobe.json", () => {
  it("is valid and about fifty-five items", () => {
    expect(items.length).toBeGreaterThanOrEqual(50);
    expect(items.length).toBeLessThanOrEqual(60);
  });

  it("uses only the 15 color families, and every category the wardrobe knows", () => {
    for (const item of items) {
      expect(COLOR_FAMILIES).toContain(item.colorFamily);
      expect(categoryKeyOf(item.category)).toBe(item.category);
    }
    expect(new Set(items.map((i) => i.category)).size).toBeGreaterThanOrEqual(7);
  });

  it("has names without the brand, realistic CAD prices and dates within the last 12 months", () => {
    for (const item of items) {
      expect(stripBrandPrefix(item.name, item.brand)).toBe(item.name);
      expect(item.name.toLowerCase().startsWith(item.brand.toLowerCase())).toBe(false);
      if (item.price !== null) {
        expect(item.price).toBeGreaterThanOrEqual(15);
        expect(item.price).toBeLessThanOrEqual(700);
      }
      const date = new Date(`${item.purchasedAt}T00:00:00Z`);
      expect(date.getTime()).toBeGreaterThanOrEqual(new Date("2025-10-13T00:00:00Z").getTime());
      expect(date.getTime()).toBeLessThanOrEqual(new Date("2026-10-13T00:00:00Z").getTime());
    }
  });

  it("includes the near-duplicates on purpose: three white tops and two grey coats", () => {
    const whiteTees = items.filter((i) => i.category === "tops" && i.colorFamily === "white");
    const greyCoats = items.filter((i) => i.category === "outerwear" && i.colorFamily === "grey");
    expect(whiteTees).toHaveLength(3);
    expect(greyCoats).toHaveLength(2);
    // Three white tops make Tops "well stocked", and four blue bottoms (jeans and cut-offs) do the same for Bottoms.
    const clusters = findClusters(
      items.map((item) => ({
        id: item.key,
        categoryKey: item.category,
        colorFamily: item.colorFamily,
        styleTags: item.tags,
        status: "active",
      }))
    );
    expect(clusters.map((c) => `${c.categoryKey}:${c.colorFamily}:${c.itemIds.length}`)).toEqual(["bottoms:blue:4", "tops:white:3"]);
  });

  it("includes the messy cases on purpose: every piece has a photo, 1 with no price, 2 needing review", () => {
    // A piece without a photo looks broken in the sample closet, so none ship.
    expect(items.filter((i) => i.image === null)).toHaveLength(0);
    expect(items.filter((i) => i.price === null)).toHaveLength(1);
    expect(items.filter((i) => i.needsReview)).toHaveLength(2);
    // And one very long bilingual name.
    expect(Math.max(...items.map((i) => i.name.length))).toBeGreaterThan(100);
  });

  it("has unique keys", () => {
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    expect(() => parseMockWardrobe([...raw, raw[0]])).toThrow();
  });

  it("rejects a color family that is not one of the 15", () => {
    expect(() => parseMockWardrobe([{ ...raw[0], colorFamily: "teal" }])).toThrow();
  });
});

describe("public/mock/README.md", () => {
  const files = [...new Set(items.map((i) => i.image).filter((f): f is string => f !== null))];

  it("lists every image file the data expects, each with a search term", () => {
    for (const file of files) {
      const row = readme.split("\n").find((line) => line.includes(`\`${file}\``));
      expect(row, `${file} is missing from the README`).toBeDefined();
      const cells = row!.split("|").map((c) => c.trim());
      expect(cells[cells.length - 2].length).toBeGreaterThan(3);
    }
  });

  it("lists no image file the data does not use", () => {
    const listed = [...readme.matchAll(/^\| `([a-z0-9-]+\.(?:jpg|png|webp))` \|/gm)].map((m) => m[1]);
    // The sample item (the second brown loafers) is not in the closet but
    // still uses its photo.
    expect(listed.sort()).toEqual([...files, "loafers-brown-tan.jpg"].sort());
  });
});

describe("ids", () => {
  it("uuidV5 matches the RFC 4122 test vector", () => {
    expect(uuidV5("python.org", "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe("886313e1-3b8a-5372-9b90-0c9aee199e5d");
  });

  it("gives every item the same ids every time, all distinct, and a different set per user", () => {
    const ids = items.flatMap((i) => Object.values(mockIds(i.key, "user-a")));
    expect(new Set(ids).size).toBe(items.length * 2);
    expect(mockIds(items[0].key, "user-a")).toEqual(mockIds(items[0].key, "user-a"));
    expect(mockIds(items[0].key, "user-a")).not.toEqual(mockIds(items[0].key, "user-b"));
  });
});

describe("buildRows", () => {
  const item: MockItem = { ...items[0], price: 34 };

  it("tags both rows as seed, prefixes the brand, and links the purchase", () => {
    const rows = buildRows(item, "user-1", () => true);
    expect(rows.purchase.source).toBe("seed");
    expect(rows.wardrobeItem.source).toBe("seed");
    expect(rows.wardrobeItem.itemName).toBe(`${item.brand} ${item.name}`);
    expect(rows.purchase.merchant).toBe(item.brand);
    expect(rows.wardrobeItem.sourcePurchaseId).toBe(rows.purchaseId);
    expect(rows.wardrobeItem.styleTags).toEqual(item.tags);
  });

  it("links an image only when its file exists", () => {
    expect(buildRows(item, "u", () => true).imageUrl).toBe(`/mock/${item.image}`);
    expect(buildRows(item, "u", () => false).imageUrl).toBeNull();
    expect(buildRows({ ...item, image: null }, "u", () => true).imageUrl).toBeNull();
  });

  it("makes a purchase with no price a review draft, and flags review items", () => {
    expect(buildRows({ ...item, price: null }, "u", () => true).purchase.status).toBe("needs_review");
    expect(buildRows(item, "u", () => true).purchase.status).toBe("active");
    expect(buildRows({ ...item, needsReview: true }, "u", () => true).wardrobeItem.status).toBe("needs_review");
    expect(buildRows(item, "u", () => true).wardrobeItem.status).toBe("active");
  });
});
