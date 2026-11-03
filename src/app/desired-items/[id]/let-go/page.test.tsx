import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/budget";
import { saveSavingsGoal } from "@/lib/goals/savingsGoal";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import LetGoPage from "./page";

describe("LetGoPage (the let-go moment)", () => {
  let fixture: TwoTenantFixture;

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await prisma.$executeRaw`DELETE FROM "savings_goals" WHERE "user_id" IN (${fixture?.userA.user.id}::uuid, ${fixture?.userB.user.id}::uuid)`;
    await fixture?.cleanup();
  });

  async function renderAs(userId: string, itemId: string) {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: userId } } as never);
    return renderToStaticMarkup(await LetGoPage({ params: Promise.resolve({ id: itemId }) }));
  }

  async function dropItem(price: string | null) {
    const id = fixture.userA.desiredItem.id;
    await prisma.desiredItem.update({
      where: { id },
      data: {
        pauseStatus: "proceeded",
        decisionOutcome: "dropped",
        price,
        brand: "Everlane",
        category: "shoes",
        colorFamily: "black",
      },
    });
    await prisma.wardrobeItem.update({
      where: { id: fixture.userA.wardrobeItem.id },
      data: { itemName: "Dr. Martens 1460 boots", colorFamily: "black" },
    });
    return id;
  }

  async function setPlan(amount: string) {
    await prisma.budget.create({
      data: { userId: fixture.userA.user.id, month: currentMonthKey(), amount },
    });
  }

  it("404s instead of showing another user's item", async () => {
    fixture = await createTwoTenantFixture();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);
    await expect(
      LetGoPage({ params: Promise.resolve({ id: fixture.userB.desiredItem.id }) })
    ).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("sends an item that wasn't let go back to its own page", async () => {
    fixture = await createTwoTenantFixture();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);
    await expect(
      LetGoPage({ params: Promise.resolve({ id: fixture.userA.desiredItem.id }) })
    ).rejects.toMatchObject({ digest: expect.stringContaining(`/desired-items/${fixture.userA.desiredItem.id}`) });
  });

  it("says what stayed in the plan, what you own and what would have happened", async () => {
    fixture = await createTwoTenantFixture();
    const id = await dropItem("189");
    await setPlan("250");

    const html = await renderAs(fixture.userA.user.id, id);

    expect(html).toContain("$189 stays in your plan");
    expect(html).toContain("Everlane");
    expect(html).toContain("You already have");
    expect(html).toContain("Dr. Martens 1460 boots");
    expect(html).toContain("Would have taken you to $189 of $250");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Back to Home");
    expect(html).toContain("/considering?tab=let-go");
  });

  it("names the amount over the plan when buying would have gone over", async () => {
    fixture = await createTwoTenantFixture();
    const id = await dropItem("300");
    await setPlan("250");
    const html = await renderAs(fixture.userA.user.id, id);
    expect(html).toContain("$300 stays in your plan");
    expect(html).toContain("$50 over your plan");
  });

  it("falls back to plain wording without a plan or a price", async () => {
    fixture = await createTwoTenantFixture();
    const noPlan = await renderAs(fixture.userA.user.id, await dropItem("189"));
    expect(noPlan).toContain("You kept $189");
    expect(noPlan).not.toContain("stays in your plan");

    await prisma.desiredItem.update({ where: { id: fixture.userA.desiredItem.id }, data: { price: null } });
    const noPrice = await renderAs(fixture.userA.user.id, fixture.userA.desiredItem.id);
    expect(noPrice).toContain("You let it go");
  });

  it("shows how far the savings goal moved, with a text equivalent for the bar", async () => {
    fixture = await createTwoTenantFixture();
    await saveSavingsGoal(fixture.userA.user.id, { name: "Lisbon trip", target: 800 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    const id = await dropItem("189");
    await prisma.$executeRaw`UPDATE "desired_items" SET "let_go_at" = now() AT TIME ZONE 'UTC' WHERE "id" = ${id}::uuid`;

    const html = await renderAs(fixture.userA.user.id, id);

    expect(html).toContain("Lisbon trip");
    expect(html).toContain("$189 of $800");
    expect(html).toContain("+$189 toward it. $611 to go.");
    expect(html).toContain('role="progressbar"');
  });

  it("shows no goal block when there is no goal", async () => {
    fixture = await createTwoTenantFixture();
    const html = await renderAs(fixture.userA.user.id, await dropItem("189"));
    expect(html).not.toContain("Savings goal");
  });
});
