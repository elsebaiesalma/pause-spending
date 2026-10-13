import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// The board is a client component that calls useRouter(); there is no app
// router when it is rendered to static markup. notFound and redirect stay real.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { auth } from "@/lib/auth";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { saveLook } from "@/lib/looks/looks";
import BoardPage from "./page";

const SLOW = 60_000;

describe("BoardPage", () => {
  let fixture: TwoTenantFixture | undefined;

  afterEach(async () => {
    vi.mocked(auth).mockReset();
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
      expect(html).toContain("Add a piece from your wardrobe to begin.");
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

  it("redirects to /login without a session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    await expect(BoardPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })).rejects.toThrow();
  });
});
