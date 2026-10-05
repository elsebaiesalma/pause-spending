import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import PurchasesPage from "./page";

describe("PurchasesPage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("never lists another user's purchases", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const element = await PurchasesPage();
      const html = renderToStaticMarkup(element);

      expect(html).toContain(fixture.userA.purchase.itemName);
      expect(html).not.toContain(fixture.userB.purchase.itemName);
      expect(html).not.toContain(fixture.userB.purchase.merchant);
    });
  });
});
