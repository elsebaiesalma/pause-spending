import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { getClosestOwned, getKeptPairs } from "./keptPairs";

describe("getKeptPairs", () => {
  let fixture: TwoTenantFixture;

  afterEach(async () => {
    await fixture?.cleanup();
  });

  it("pairs a let-go item with the closest piece the same person owns", async () => {
    fixture = await createTwoTenantFixture();
    await prisma.wardrobeItem.update({
      where: { id: fixture.userA.wardrobeItem.id },
      data: { colorFamily: "black" },
    });
    const item = await prisma.desiredItem.update({
      where: { id: fixture.userA.desiredItem.id },
      data: { category: "shoes", colorFamily: "black" },
    });

    const owned = await getClosestOwned(fixture.userA.user.id, item);
    expect(owned?.id).toBe(fixture.userA.wardrobeItem.id);

    const pairs = await getKeptPairs(fixture.userA.user.id, [item]);
    expect(pairs[item.id]?.id).toBe(fixture.userA.wardrobeItem.id);
  });

  it("never pairs with another person's closet", async () => {
    fixture = await createTwoTenantFixture();
    await prisma.wardrobeItem.update({ where: { id: fixture.userB.wardrobeItem.id }, data: { colorFamily: "black" } });
    // User A owns nothing black, so there's no pair even though B does.
    await prisma.wardrobeItem.update({ where: { id: fixture.userA.wardrobeItem.id }, data: { colorFamily: "white", category: "tops" } });
    const item = await prisma.desiredItem.update({
      where: { id: fixture.userA.desiredItem.id },
      data: { category: "shoes", colorFamily: "black" },
    });
    expect(await getClosestOwned(fixture.userA.user.id, item)).toBeNull();
  });

  it("gives no pair for an untagged item", async () => {
    fixture = await createTwoTenantFixture();
    expect(await getClosestOwned(fixture.userA.user.id, fixture.userA.desiredItem)).toBeNull();
    expect(await getKeptPairs(fixture.userA.user.id, [fixture.userA.desiredItem])).toEqual({});
  });
});
