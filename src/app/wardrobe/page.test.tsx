import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import WardrobePage from "./page";

describe("WardrobePage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("never lists another user's wardrobe items", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const element = await WardrobePage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      });
      const html = renderToStaticMarkup(element);

      expect(html).toContain(fixture.userA.wardrobeItem.itemName);
      expect(html).not.toContain(fixture.userB.wardrobeItem.itemName);
    });
  });

  describe("cards and header", () => {
    const itemIds: string[] = [];
    const purchaseIds: string[] = [];

    afterEach(async () => {
      await prisma.wardrobeItem.deleteMany({ where: { id: { in: itemIds.splice(0) } } });
      await prisma.purchase.deleteMany({ where: { id: { in: purchaseIds.splice(0) } } });
    });

    async function renderFor(userId: string) {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId } } as never);
      const element = await WardrobePage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });
      return renderToStaticMarkup(element);
    }

    async function seedCard(source: string | null) {
      const user = await prisma.user.findFirstOrThrow();
      const purchase = await prisma.purchase.create({
        data: { userId: user.id, merchant: "COS", orderDate: new Date("2026-03-01"), itemName: "COS Boxy Fit Tee", price: "59", category: "tops" },
      });
      purchaseIds.push(purchase.id);
      const item = await prisma.wardrobeItem.create({
        data: {
          userId: user.id,
          sourcePurchaseId: purchase.id,
          itemName: "COS Boxy Fit Tee",
          category: "tops",
          colorName: "espresso",
          colorFamily: "brown",
          imageUrl: "https://example.com/tee.jpg",
          ownedSince: new Date("2026-03-01"),
          source,
        },
      });
      itemIds.push(item.id);
      return user.id;
    }

    it("strips the brand from the displayed name and capitalizes the color name", async () => {
      const html = await renderFor(await seedCard(null));
      expect(html).toContain(">Boxy Fit Tee<");
      expect(html).not.toContain(">COS Boxy Fit Tee<");
      expect(html).toContain("Espresso");
    });

    it("puts the date top right beside the brand, and the price bottom left", async () => {
      const html = await renderFor(await seedCard(null));
      const price = html.indexOf(">$59<");
      const date = html.indexOf(">Mar 2026<");
      const name = html.indexOf(">Boxy Fit Tee<");
      expect(price).toBeGreaterThan(-1);
      expect(date).toBeGreaterThan(-1);
      // Top row (brand, date), then the name, then the footer (price, colour).
      expect(date).toBeLessThan(name);
      expect(price).toBeGreaterThan(name);
    });

    it("shows a seeded row's photo, and the garment drawing only when it has no image", async () => {
      const withImage = await renderFor(await seedCard("seed"));
      expect(withImage).toContain("example.com/tee.jpg");
      expect(withImage).not.toContain("Garment illustration");

      await prisma.wardrobeItem.updateMany({ where: { id: { in: itemIds } }, data: { imageUrl: null } });
      const withoutImage = await renderFor((await prisma.user.findFirstOrThrow()).id);
      expect(withoutImage).not.toContain("example.com/tee.jpg");
      expect(withoutImage).toContain("Garment illustration");
    });

    it("opens on the Grid view with the toggle pressed, and puts the hero and piece count at the top", async () => {
      const html = await renderFor(await seedCard(null));
      expect(html).toContain("What you already own is the starting point.");
      expect(html).toMatch(/aria-pressed="true"[^>]*>Grid</);
      expect(html).toMatch(/aria-pressed="false"[^>]*>Rack</);
      expect(html).toContain('type="search"');
      expect(html).not.toContain("Rack view");
    });

    it("keeps the real photo for non-seed items", async () => {
      const html = await renderFor(await seedCard(null));
      expect(html).toContain("example.com/tee.jpg");
    });

    it("puts Add a piece in the page header, with labelled fields, a category list, a colour picker and More details", async () => {
      const html = await renderFor((await prisma.user.findFirstOrThrow()).id);
      expect(html).toContain('href="#add-to-wardrobe"');
      expect(html).toContain('for="piece-name"');
      expect(html).toContain('for="piece-category"');
      // The three most common colours first, then Show more and Other.
      expect(html.match(/name="colorPick"/g)!.length).toBeGreaterThanOrEqual(4);
      expect(html).toContain("Show more");
      expect(html).toContain(">Other<");
      expect(html).toContain("More details");
      expect(html).not.toContain("comma separated");
    });
  });
});
