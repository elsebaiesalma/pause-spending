import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// The pause screen's payload comes from a pipeline that calls the model; this
// file is about the look button and the Buy anyway gate, so it is stubbed.
vi.mock("@/lib/pauseScreen/assemblePauseScreen", () => ({
  assemblePauseScreen: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { auth } from "@/lib/auth";
import { assemblePauseScreen } from "@/lib/pauseScreen/assemblePauseScreen";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { saveLook } from "@/lib/looks/looks";
import PauseScreenPage from "./page";

const SLOW = 60_000;

describe("PauseScreenPage: build a look, and the Buy anyway gate", () => {
  let fixture: TwoTenantFixture | undefined;

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    vi.mocked(assemblePauseScreen).mockReset();
    await fixture?.cleanup();
    fixture = undefined;
  });

  async function render(tenant: TwoTenantFixture["userA"]) {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: tenant.user.id } } as never);
    vi.mocked(assemblePauseScreen).mockResolvedValueOnce({
      desiredItem: tenant.desiredItem,
      similarItems: [],
      similarItemReasons: {},
      redundancyExplanation: null,
      budget: { hasBudget: false, monthKey: "2026-10", spend: 0 },
      reflection: null,
    });
    const element = await PauseScreenPage({
      params: Promise.resolve({ id: tenant.desiredItem.id }),
      searchParams: Promise.resolve({}),
    });
    return renderToStaticMarkup(element);
  }

  it(
    "offers 'Build this look from your closet' in A moment to think, returning to the pause screen",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      const html = await render(userA);

      expect(html).toContain("Build this look from your closet");
      expect(html).toContain(`/lookbook/board?for=${userA.desiredItem.id}`);
      expect(html).toContain(encodeURIComponent(`/desired-items/${userA.desiredItem.id}/pause#reflection`));
      // The button is inside the reflection section, before the actions.
      expect(html.indexOf("A moment to think")).toBeLessThan(html.indexOf("Build this look from your closet"));
      expect(html.indexOf("Build this look from your closet")).toBeLessThan(html.indexOf("Pause for 24 hours"));
    },
    SLOW
  );

  it(
    "the gate is closed with no reflection answer and no look",
    async () => {
      fixture = await createTwoTenantFixture();
      const html = await render(fixture.userA);

      expect(html).toContain('data-reflection-answered="false"');
      expect(html).not.toContain("You have built a look for this one.");
    },
    SLOW
  );

  it(
    "a saved look counts as a reflection answer, so Buy anyway no longer asks for one",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      await saveLook(userA.user.id, {
        placements: [{ wardrobeItemId: userA.wardrobeItem.id, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 }],
        inspiredByDesiredItemId: userA.desiredItem.id,
      });

      const html = await render(userA);

      expect(html).toContain('data-reflection-answered="true"');
      expect(html).toContain("You have built a look for this one.");
    },
    SLOW
  );

  it(
    "a look built for a different item does not open the gate",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      const other = await (await import("@/lib/prisma")).prisma.desiredItem.create({
        data: { userId: userA.user.id, sourceType: "typed", itemName: "Something else", userConfirmed: true },
      });
      await saveLook(userA.user.id, {
        placements: [{ wardrobeItemId: userA.wardrobeItem.id, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 }],
        inspiredByDesiredItemId: other.id,
      });

      expect(await render(userA)).toContain('data-reflection-answered="false"');
    },
    SLOW
  );
});
