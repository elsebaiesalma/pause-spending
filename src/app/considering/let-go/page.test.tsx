import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import LetGoListPage from "./page";

describe("LetGoListPage", () => {
  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      vi.mocked(auth).mockReset();
      await fixture?.cleanup();
    });

    it("never lists another user's let-go items", async () => {
      fixture = await createTwoTenantFixture();
      await prisma.desiredItem.update({
        where: { id: fixture.userA.desiredItem.id },
        data: { decisionOutcome: "dropped", userConfirmed: true, price: "40.00" },
      });
      await prisma.desiredItem.update({
        where: { id: fixture.userB.desiredItem.id },
        data: { decisionOutcome: "dropped", userConfirmed: true, price: "40.00" },
      });
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const element = await LetGoListPage();
      const html = renderToStaticMarkup(element);

      expect(html).toContain(fixture.userA.desiredItem.itemName);
      expect(html).not.toContain(fixture.userB.desiredItem.itemName);
    });
  });
});
