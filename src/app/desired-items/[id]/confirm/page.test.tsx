import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import ConfirmDesiredItemPage from "./page";

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }), searchParams: Promise.resolve({}) };
}

describe("ConfirmDesiredItemPage", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("redirects to /login instead of rendering when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    await expect(ConfirmDesiredItemPage(await ctxFor("some-id"))).rejects.toThrow();
  });

  it("shows a distinct low-confidence message for a slug-guessed URL-paste itemName, never presenting it as a confirmed find", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: {
        userId: user.id,
        sourceType: "url",
        rawInput: "https://retailer.com/blocked",
        itemName: "Wool Coat",
        itemNameConfidence: "low",
      },
    });
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const element = await ConfirmDesiredItemPage(await ctxFor(item.id));
    const html = renderToStaticMarkup(element);

    expect(html).toContain("best guess from the link itself");
    expect(html).not.toContain("Here&#x27;s what we found");

    await prisma.desiredItem.delete({ where: { id: item.id } });
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("404s instead of rendering another user's desired item", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      await expect(ConfirmDesiredItemPage(await ctxFor(fixture.userB.desiredItem.id))).rejects.toMatchObject({
        digest: "NEXT_HTTP_ERROR_FALLBACK;404",
      });
    });
  });
});
