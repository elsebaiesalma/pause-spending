import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
  redirect: () => {},
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import ConsideringPage from "./page";

describe("ConsideringPage", () => {
  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      vi.mocked(auth).mockReset();
      await fixture?.cleanup();
    });

    it("never lists another user's waiting or saved items", async () => {
      fixture = await createTwoTenantFixture();
      await prisma.desiredItem.update({
        where: { id: fixture.userA.desiredItem.id },
        data: { pauseStatus: "waiting", waitUntil: new Date("2099-01-01") },
      });
      await prisma.desiredItem.update({
        where: { id: fixture.userB.desiredItem.id },
        data: { pauseStatus: "waiting", waitUntil: new Date("2099-01-01") },
      });
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const element = await ConsideringPage();
      const html = renderToStaticMarkup(element);

      expect(html).toContain(fixture.userA.desiredItem.itemName);
      expect(html).not.toContain(fixture.userB.desiredItem.itemName);
    });

    it("never lists another user's let-go items on the Let go tab", async () => {
      fixture = await createTwoTenantFixture();
      const letGo = { pauseStatus: "proceeded", decisionOutcome: "dropped", userConfirmed: true, price: "80" };
      await prisma.desiredItem.update({ where: { id: fixture.userA.desiredItem.id }, data: letGo });
      await prisma.desiredItem.update({ where: { id: fixture.userB.desiredItem.id }, data: letGo });
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const html = renderToStaticMarkup(await ConsideringPage({ searchParams: Promise.resolve({ tab: "let-go" }) }));

      expect(html).toContain(fixture.userA.desiredItem.itemName);
      expect(html).not.toContain(fixture.userB.desiredItem.itemName);
      expect(html).toContain(`href="/desired-items/${fixture.userA.desiredItem.id}"`);
    });
  });
});
