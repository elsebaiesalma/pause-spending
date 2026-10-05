import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import type { Budget, DesiredItem, EmailConnection, Purchase, User, WardrobeItem } from "@prisma/client";

export type Tenant = {
  user: User;
  purchase: Purchase;
  wardrobeItem: WardrobeItem;
  desiredItem: DesiredItem;
  budget: Budget;
  emailConnection: EmailConnection;
};

export type TwoTenantFixture = {
  userA: Tenant;
  userB: Tenant;
  cleanup: () => Promise<void>;
};

let sequence = 0;

async function createTenant(label: "a" | "b"): Promise<Tenant> {
  sequence += 1;
  const user = await prisma.user.create({
    data: { email: `tenant-${label}-${Date.now()}-${sequence}@pause-spending.test` },
  });

  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      merchant: `Tenant ${label.toUpperCase()} Retailer`,
      orderDate: new Date("2026-01-15"),
      itemName: `Tenant ${label.toUpperCase()} Coat`,
      price: "120.00",
      category: "outerwear",
      status: "active",
    },
  });

  const wardrobeItem = await prisma.wardrobeItem.create({
    data: {
      userId: user.id,
      itemName: `Tenant ${label.toUpperCase()} Boots`,
      category: "shoes",
      status: "active",
    },
  });

  const desiredItem = await prisma.desiredItem.create({
    data: {
      userId: user.id,
      sourceType: "typed",
      rawInput: `tenant ${label} blazer`,
      itemName: `Tenant ${label.toUpperCase()} Blazer`,
      userConfirmed: true,
    },
  });

  const budget = await prisma.budget.create({
    data: {
      userId: user.id,
      month: "2026-09",
      amount: "500.00",
    },
  });

  const emailConnection = await prisma.emailConnection.create({
    data: {
      userId: user.id,
      provider: "gmail",
      encryptedToken: encrypt("{}"),
      status: "connected",
    },
  });

  return { user, purchase, wardrobeItem, desiredItem, budget, emailConnection };
}

// Two fully-populated tenants (one row of every user-owned type) for
// cross-tenant isolation tests: "authenticate as A, target B's row" tests
// across the suite share this fixture so the shape under test is identical
// everywhere the {id, userId} scoping pattern is being verified. `cleanup`
// deletes both users; every owned row cascades via the schema's
// onDelete: Cascade, so no other cleanup call is needed.
export async function createTwoTenantFixture(): Promise<TwoTenantFixture> {
  const [userA, userB] = await Promise.all([createTenant("a"), createTenant("b")]);

  const cleanup = async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userA.user.id, userB.user.id] } } });
  };

  return { userA, userB, cleanup };
}
