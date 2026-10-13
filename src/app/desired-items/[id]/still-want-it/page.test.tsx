import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// The outfit section is an async server component that calls the model.
vi.mock("./OutfitSection", () => ({
  OutfitSection: () => null,
  OutfitSkeleton: () => null,
}));

import { auth } from "@/lib/auth";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { saveLook } from "@/lib/looks/looks";
import StillWantItPage from "./page";

const SLOW = 60_000;

describe("StillWantItPage", () => {
  let fixture: TwoTenantFixture | undefined;

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await fixture?.cleanup();
    fixture = undefined;
  });

  async function render(tenant: TwoTenantFixture["userA"]) {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: tenant.user.id } } as never);
    const element = await StillWantItPage({
      params: Promise.resolve({ id: tenant.desiredItem.id }),
      searchParams: Promise.resolve({}),
    });
    return renderToStaticMarkup(element);
  }

  it(
    "replaces lower-priced and secondhand with 'Build it from your closet', and keeps One last check",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      const html = await render(userA);

      expect(html).toContain("02 / Build it from your closet");
      expect(html).toContain("03 / One last check");
      expect(html).not.toContain("Lower-priced");
      expect(html).not.toContain("Secondhand");
      expect(html).not.toContain("Search on ");
      // The board opens toward this item and comes back here.
      expect(html).toContain(`/lookbook/board?for=${userA.desiredItem.id}`);
      expect(html).toContain(encodeURIComponent(`/desired-items/${userA.desiredItem.id}/still-want-it`));
      // The actions are still there.
      expect(html).toContain("Pause for 24 hours");
      expect(html).toContain("Let it go");
    },
    SLOW
  );

  it(
    "offers to open the look once one is saved for the item",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      await saveLook(userA.user.id, {
        placements: [{ wardrobeItemId: userA.wardrobeItem.id, x: 0.2, y: 0.2, scale: 0.4, zOrder: 0 }],
        inspiredByDesiredItemId: userA.desiredItem.id,
      });

      const html = await render(userA);

      expect(html).toContain("Open your look");
      expect(html).toContain("You built a look from your closet.");
    },
    SLOW
  );

  it(
    "404s for another user's item",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA, userB } = fixture;
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: userA.user.id } } as never);

      await expect(
        StillWantItPage({ params: Promise.resolve({ id: userB.desiredItem.id }), searchParams: Promise.resolve({}) })
      ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    },
    SLOW
  );
});
