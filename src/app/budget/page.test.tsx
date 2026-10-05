import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import BudgetPage from "./page";

describe("BudgetPage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("shows this user's own budget, never another user's amount", async () => {
      fixture = await createTwoTenantFixture();
      await prisma.budget.update({
        where: { id: fixture.userA.budget.id },
        data: { amount: "111.11" },
      });
      await prisma.budget.update({
        where: { id: fixture.userB.budget.id },
        data: { amount: "999.99" },
      });
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const element = await BudgetPage();
      const html = renderToStaticMarkup(element);

      expect(html).toContain("111.11");
      expect(html).not.toContain("999.99");
    });
  });
});
