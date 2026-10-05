import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import EditWardrobeItemPage from "./page";

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }), searchParams: Promise.resolve({}) };
}

describe("EditWardrobeItemPage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("redirects to /login instead of rendering when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    await expect(EditWardrobeItemPage(await ctxFor("some-id"))).rejects.toThrow();
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("404s instead of rendering another user's wardrobe item", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      await expect(EditWardrobeItemPage(await ctxFor(fixture.userB.wardrobeItem.id))).rejects.toMatchObject({
        digest: "NEXT_HTTP_ERROR_FALLBACK;404",
      });
    });
  });
});
