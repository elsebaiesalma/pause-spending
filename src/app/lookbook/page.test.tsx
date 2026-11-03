import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// LookCard is a client component that calls useRouter(); there is no app
// router when rendering to static markup.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { saveLook } from "@/lib/looks/looks";
import LookbookPage from "./page";

const SLOW = 60_000;
const piece = (wardrobeItemId: string) => ({ wardrobeItemId, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 });

describe("LookbookPage", () => {
  let fixture: TwoTenantFixture | undefined;

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await fixture?.cleanup();
    fixture = undefined;
  });

  async function render(userId: string) {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId } } as never);
    return renderToStaticMarkup(await LookbookPage());
  }

  it("redirects to /login without a session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    await expect(LookbookPage()).rejects.toThrow();
  });

  it(
    "with no looks: the hero, a zero count, and a Start from a suggestion button that opens the board",
    async () => {
      fixture = await createTwoTenantFixture();
      const html = await render(fixture.userA.user.id);

      expect(html).toContain("Something new, from what you own.");
      expect(html).toContain("New look");
      expect(html).toContain("Start from a suggestion");
      expect(html).toContain('href="/lookbook/board"');
      expect(html).toMatch(/Looks<span[^>]*>0</);
    },
    SLOW
  );

  it(
    "lists only the signed-in user's looks, with name, date and an open link",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA, userB } = fixture;
      const aLook = (await saveLook(userA.user.id, { name: "Dinner", placements: [piece(userA.wardrobeItem.id)] }))!;
      await saveLook(userB.user.id, { name: "Secret look", placements: [piece(userB.wardrobeItem.id)] });

      const html = await render(userA.user.id);

      expect(html).toContain("Dinner");
      expect(html).not.toContain("Secret look");
      expect(html).toContain(`href="/lookbook/board?look=${aLook}"`);
      expect(html).toMatch(/Looks<span[^>]*>1</);
      expect(html).not.toContain("Start from a suggestion");
      // The ⋯ menu offers rename and delete.
      expect(html).toContain("Rename");
      expect(html).toContain("Delete");
    },
    SLOW
  );

  it(
    "shows 'Built instead of' as text only, and not at all once the wanted item is gone",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      await prisma.wardrobeItem.update({ where: { id: userA.wardrobeItem.id }, data: { imageUrl: null } });
      await prisma.desiredItem.update({ where: { id: userA.desiredItem.id }, data: { imageUrl: "https://example.com/wanted.jpg" } });
      await saveLook(userA.user.id, {
        placements: [piece(userA.wardrobeItem.id)],
        inspiredByDesiredItemId: userA.desiredItem.id,
      });

      const withItem = await render(userA.user.id);
      expect(withItem).toContain("Built instead of Tenant A Blazer");
      expect(withItem).not.toContain("example.com/wanted.jpg");

      await prisma.desiredItem.delete({ where: { id: userA.desiredItem.id } });
      const withoutItem = await render(userA.user.id);
      expect(withoutItem).not.toContain("Built instead of");
      expect(withoutItem).toContain("Look 01");
    },
    SLOW
  );

  it(
    "hides a look whose pieces have all been deleted",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      await saveLook(userA.user.id, { name: "Ghost", placements: [piece(userA.wardrobeItem.id)] });
      await prisma.wardrobeItem.delete({ where: { id: userA.wardrobeItem.id } });

      const html = await render(userA.user.id);

      expect(html).not.toContain("Ghost");
      expect(html).toContain("Start from a suggestion");
    },
    SLOW
  );
});
