import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import DesiredItemPage from "./page";

describe("DesiredItemPage (item page)", () => {
  let fixture: TwoTenantFixture;

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await fixture?.cleanup();
  });

  async function renderAs(userId: string, itemId: string) {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId } } as never);
    return renderToStaticMarkup(await DesiredItemPage({ params: Promise.resolve({ id: itemId }) }));
  }

  it("404s instead of showing another user's item", async () => {
    fixture = await createTwoTenantFixture();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

    await expect(DesiredItemPage({ params: Promise.resolve({ id: fixture.userB.desiredItem.id }) })).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });

  it("shows only the name, brand and unlock while an item is paused, never the photo or price", async () => {
    fixture = await createTwoTenantFixture();
    const id = fixture.userA.desiredItem.id;
    await prisma.desiredItem.update({
      where: { id },
      data: {
        userConfirmed: true,
        pauseStatus: "waiting",
        waitUntil: new Date("2099-01-01"),
        price: "120",
        imageUrl: "https://example.com/blazer.jpg",
      },
    });

    const html = await renderAs(fixture.userA.user.id, id);

    expect(html).toContain(fixture.userA.desiredItem.itemName);
    expect(html).toContain("Paused");
    expect(html).not.toContain("example.com/blazer.jpg");
    expect(html).not.toContain("$120");
    expect(html).toContain("Let it go now");
  });

  it("offers Restore for a let-go item and links back to the Let go tab", async () => {
    fixture = await createTwoTenantFixture();
    const id = fixture.userA.desiredItem.id;
    await prisma.desiredItem.update({
      where: { id },
      data: { userConfirmed: true, pauseStatus: "proceeded", decisionOutcome: "dropped", price: "90" },
    });

    const html = await renderAs(fixture.userA.user.id, id);

    expect(html).toContain("Let go");
    expect(html).toContain(`/api/desired-items/${id}/restore`);
    expect(html).toContain('href="/considering?tab=let-go"');
    expect(html).toContain("$90");
  });

  it("sends an undecided item back to the pause screen to decide", async () => {
    fixture = await createTwoTenantFixture();
    const id = fixture.userA.desiredItem.id;
    await prisma.desiredItem.update({ where: { id }, data: { userConfirmed: true, pauseStatus: "saved_for_later" } });

    const html = await renderAs(fixture.userA.user.id, id);

    expect(html).toContain("Undecided");
    expect(html).toContain(`href="/desired-items/${id}/pause"`);
    expect(html).toContain("Decide now");
  });
});
