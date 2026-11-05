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

describe("PauseScreenPage: build a look, steps, and Buy anyway", () => {
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
    "offers 'Style what you already own' in A moment to think, returning to the pause screen",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      const html = await render(userA);

      expect(html).toContain("Style what you already own");
      expect(html).toContain(`/lookbook/board?for=${userA.desiredItem.id}`);
      expect(html).toContain(encodeURIComponent(`/desired-items/${userA.desiredItem.id}/pause#reflection`));
      // The button is inside the reflection section, before the actions.
      expect(html.indexOf("A moment to think")).toBeLessThan(html.indexOf("Style what you already own"));
      expect(html.indexOf("Style what you already own")).toBeLessThan(html.indexOf("Pause for 24 hours"));
    },
    SLOW
  );

  it(
    "Buy anyway is a plain submit button: no reflection answer is needed",
    async () => {
      fixture = await createTwoTenantFixture();
      const html = await render(fixture.userA);

      expect(html).toContain("Buy anyway");
      expect(html).not.toContain("data-reflection-answered");
      expect(html).not.toContain("Answer one quick question first");
      expect(html).toContain("Or skip the wait");
      expect(html).not.toContain("or decide now");
      expect(html).not.toContain("You have built a look for this one.");
    },
    SLOW
  );

  it(
    "shows a saved look for this item, and not one built for a different item",
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
      expect(await render(userA)).not.toContain("You have built a look for this one.");

      await saveLook(userA.user.id, {
        placements: [{ wardrobeItemId: userA.wardrobeItem.id, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 }],
        inspiredByDesiredItemId: userA.desiredItem.id,
      });
      expect(await render(userA)).toContain("You have built a look for this one.");
    },
    SLOW
  );

  it(
    "asks one question at a time and ends on the cost of buying",
    async () => {
      fixture = await createTwoTenantFixture();
      const html = await render(fixture.userA);

      expect(html).toContain("Question 1 of 3");
      expect(html.indexOf("What would this replace?")).toBeLessThan(html.indexOf("How much do you need it?"));
      expect(html.indexOf("How much do you need it?")).toBeLessThan(html.indexOf("One reason for"));
    },
    SLOW
  );
});
