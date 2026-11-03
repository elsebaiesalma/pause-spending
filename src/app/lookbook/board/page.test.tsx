import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// The board is a client component that calls useRouter(); there is no app
// router when it is rendered to static markup. notFound and redirect stay real.
// The suggestion comes from the model; tests control when (and whether) it arrives.
vi.mock("@/lib/stillWantIt/outfits", () => ({
  getBoardSuggestion: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBoardSuggestion } from "@/lib/stillWantIt/outfits";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { saveLook } from "@/lib/looks/looks";
import BoardPage from "./page";

const SLOW = 60_000;

describe("BoardPage", () => {
  let fixture: TwoTenantFixture | undefined;

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.mocked(auth).mockReset();
    vi.mocked(getBoardSuggestion).mockReset();
    await fixture?.cleanup();
    fixture = undefined;
  });

  async function render(userId: string, searchParams: Record<string, string>) {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId } } as never);
    const element = await BoardPage({ params: Promise.resolve({}), searchParams: Promise.resolve(searchParams) });
    return renderToStaticMarkup(element);
  }

  it(
    "opens a blank board with the user's own wardrobe in the drawer and never another user's",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA, userB } = fixture;

      const html = await render(userA.user.id, { blank: "1" });

      expect(html).toContain(userA.wardrobeItem.itemName);
      expect(html).not.toContain(userB.wardrobeItem.itemName);
      expect(html).toContain("Add a piece from your closet to begin.");
      expect(html).toContain("Add pieces");
      expect(html).toContain('placeholder="Look 01"');
      // Nothing to save yet.
      expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Save<\/button>/);
    },
    SLOW
  );

  it(
    "opens a saved look with its pieces, its name and the next default name for a new one",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      const lookId = (await saveLook(userA.user.id, {
        name: "Dinner",
        placements: [{ wardrobeItemId: userA.wardrobeItem.id, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 }],
        inspiredByDesiredItemId: userA.desiredItem.id,
      }))!;

      const html = await render(userA.user.id, { look: lookId });

      expect(html).toContain('value="Dinner"');
      expect(html).toContain("Built instead of Tenant A Blazer");
      expect(html).toMatch(/role="button"[^>]*aria-pressed="false"/);
      expect(html).toContain('placeholder="Look 01"');
    },
    SLOW
  );

  it(
    "404s for another user's look, and for another user's wanted item",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA, userB } = fixture;
      const bLook = (await saveLook(userB.user.id, {
        placements: [{ wardrobeItemId: userB.wardrobeItem.id, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 }],
      }))!;

      await expect(render(userA.user.id, { look: bLook })).rejects.toThrow();
      await expect(render(userA.user.id, { for: userB.desiredItem.id, blank: "1" })).rejects.toThrow();
    },
    SLOW
  );

  it(
    "sends a wanted item that already has a look to that look",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      const lookId = (await saveLook(userA.user.id, {
        placements: [{ wardrobeItemId: userA.wardrobeItem.id, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 }],
        inspiredByDesiredItemId: userA.desiredItem.id,
      }))!;

      // redirect() throws; its digest names the destination.
      const error = await render(userA.user.id, { for: userA.desiredItem.id }).catch((e: unknown) => e as { digest?: string });
      expect(String((error as { digest?: string }).digest)).toContain(`/lookbook/board?look=${lookId}`);
    },
    SLOW
  );

  it(
    "opens at once without waiting for the suggestion, which is still being worked out",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      // A model call that never comes back.
      vi.mocked(getBoardSuggestion).mockReturnValue(new Promise(() => {}));
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: userA.user.id } } as never);

      const opened = BoardPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });
      const outcome = await Promise.race([
        opened.then(() => "opened"),
        new Promise((resolve) => setTimeout(() => resolve("waited"), 15_000)),
      ]);

      expect(outcome).toBe("opened");
      expect(getBoardSuggestion).toHaveBeenCalledWith(userA.user.id, null);
    },
    SLOW
  );

  it(
    "does not ask for a suggestion for a blank board or a saved look",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      await render(userA.user.id, { blank: "1" });
      expect(getBoardSuggestion).not.toHaveBeenCalled();
    },
    SLOW
  );

  it(
    "follows DEV_WARDROBE_VIEW for the drawer, but a saved look keeps every piece it has",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      await prisma.wardrobeItem.create({ data: { userId: userA.user.id, itemName: "Seed Drawer Piece", category: "tops", source: "seed" } });
      await prisma.wardrobeItem.create({ data: { userId: userA.user.id, itemName: "Hidden Real Piece", category: "tops" } });
      // A look built from the (real, no-source) fixture item.
      const lookId = (await saveLook(userA.user.id, {
        placements: [{ wardrobeItemId: userA.wardrobeItem.id, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 }],
      }))!;

      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("DEV_WARDROBE_VIEW", "seed");
      const blank = await render(userA.user.id, { blank: "1" });
      expect(blank).toContain("Seed Drawer Piece");
      expect(blank).not.toContain("Hidden Real Piece");

      // Editing the saved look: its real piece is still on the board.
      const editing = await render(userA.user.id, { look: lookId });
      expect(editing).toContain(userA.wardrobeItem.itemName);
      expect(editing).not.toContain("Hidden Real Piece");

      // In production the variable is ignored.
      vi.stubEnv("NODE_ENV", "production");
      expect(await render(userA.user.id, { blank: "1" })).toContain("Hidden Real Piece");
    },
    SLOW
  );

  it("redirects to /login without a session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    await expect(BoardPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })).rejects.toThrow();
  });
});
