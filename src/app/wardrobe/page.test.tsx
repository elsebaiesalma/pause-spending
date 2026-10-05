import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
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
});
