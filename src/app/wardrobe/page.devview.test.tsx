import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DevViewBanner } from "@/components/DevViewBanner";
import WardrobePage from "./page";

const SLOW = 60_000;

describe("DEV_WARDROBE_VIEW on the Wardrobe page", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.mocked(auth).mockReset();
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  });

  async function setUp() {
    const user = await prisma.user.create({ data: { email: `devview-${Date.now()}-${userIds.length}@pause-spending.test` } });
    userIds.push(user.id);
    await prisma.wardrobeItem.create({ data: { userId: user.id, itemName: "Seed Piece Alpha", category: "tops", source: "seed" } });
    await prisma.wardrobeItem.create({ data: { userId: user.id, itemName: "Real Piece Bravo", category: "tops" } });
    return user;
  }

  async function render(userId: string) {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId } } as never);
    const element = await WardrobePage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });
    return renderToStaticMarkup(element);
  }

  it(
    "shows everything when the variable is not set",
    async () => {
      const user = await setUp();
      const html = await render(user.id);
      expect(html).toContain("Seed Piece Alpha");
      expect(html).toContain("Real Piece Bravo");
    },
    SLOW
  );

  it(
    "'seed' shows only seed items, and 'real' only real ones, in development",
    async () => {
      const user = await setUp();

      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("DEV_WARDROBE_VIEW", "seed");
      const seed = await render(user.id);
      expect(seed).toContain("Seed Piece Alpha");
      expect(seed).not.toContain("Real Piece Bravo");

      vi.stubEnv("DEV_WARDROBE_VIEW", "real");
      const real = await render(user.id);
      expect(real).toContain("Real Piece Bravo");
      expect(real).not.toContain("Seed Piece Alpha");
    },
    SLOW
  );

  it(
    "does nothing in production: both views show every item, and no banner appears",
    async () => {
      const user = await setUp();
      vi.stubEnv("NODE_ENV", "production");

      for (const value of ["seed", "real"]) {
        vi.stubEnv("DEV_WARDROBE_VIEW", value);
        const html = await render(user.id);
        expect(html).toContain("Seed Piece Alpha");
        expect(html).toContain("Real Piece Bravo");
        expect(renderToStaticMarkup(DevViewBanner())).toBe("");
      }
    },
    SLOW
  );

  it("shows the banner whenever a filter is active, outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_WARDROBE_VIEW", "seed");
    expect(renderToStaticMarkup(DevViewBanner())).toContain("Showing seed items only");

    vi.stubEnv("DEV_WARDROBE_VIEW", "real");
    expect(renderToStaticMarkup(DevViewBanner())).toContain("Showing real items only");

    vi.stubEnv("DEV_WARDROBE_VIEW", "all");
    expect(renderToStaticMarkup(DevViewBanner())).toBe("");
  });
});
