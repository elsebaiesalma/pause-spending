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

    it("lists price first, then the date on its own line", async () => {
      const html = await renderFor(await seedCard(null));
      const price = html.indexOf(">$59<");
      const date = html.indexOf(">Mar 2026<");
      expect(price).toBeGreaterThan(-1);
      expect(date).toBeGreaterThan(price);
    });

    it("uses the category placeholder, not an image or silhouette, for seeded rows", async () => {
      const html = await renderFor(await seedCard("seed"));
      expect(html).not.toContain("example.com/tee.jpg");
      expect(html).not.toContain("Garment illustration");
      expect(html).toContain(">tops<");
    });

    it("keeps the real photo for non-seed items", async () => {
      const html = await renderFor(await seedCard(null));
      expect(html).toContain("example.com/tee.jpg");
    });

    it("puts Add to wardrobe in the page header, with a 15-color dropdown and an optional color name", async () => {
      const html = await renderFor((await prisma.user.findFirstOrThrow()).id);
      expect(html).toContain('href="#add-to-wardrobe"');
      const options = html.match(/<select id="colorFamily"[\s\S]*?<\/select>/)?.[0] ?? "";
      expect(options.match(/<option /g)).toHaveLength(16); // placeholder + 15 families
      expect(options).toContain(">Navy<");
      expect(html).toContain('placeholder="Color name (optional)');
    });
  });
});
