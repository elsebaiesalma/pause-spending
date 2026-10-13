import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { saveLook } from "@/lib/looks/looks";
import { POST } from "./route";
import { DELETE, PATCH, PUT } from "./[id]/route";

const SLOW = 60_000;

function json(method: string, body: unknown) {
  return new NextRequest("http://localhost:3000/api/looks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const piece = (wardrobeItemId: string, zOrder = 0) => ({ wardrobeItemId, x: 0.2, y: 0.2, scale: 0.4, zOrder });

function signInAs(userId: string) {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);
}

describe("looks API", () => {
  let fixture: TwoTenantFixture | undefined;

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await fixture?.cleanup();
    fixture = undefined;
  });

  it("returns 401 without a session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await POST(json("POST", { placements: [] }))).status).toBe(401);
    expect((await DELETE(json("DELETE", {}), ctx("x"))).status).toBe(401);
  });

  it("rejects a malformed body", async () => {
    fixture = await createTwoTenantFixture();
    signInAs(fixture.userA.user.id);
    expect((await POST(json("POST", { placements: [{ wardrobeItemId: "not-a-uuid", x: 0, y: 0, scale: 0.3, zOrder: 0 }] }))).status).toBe(400);
    expect((await POST(json("POST", { nope: true }))).status).toBe(400);
  }, SLOW);

  it(
    "saves a look of the signed-in user's own pieces, and does not save an empty board",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      signInAs(userA.user.id);

      const saved = await POST(json("POST", { placements: [piece(userA.wardrobeItem.id)], inspiredByDesiredItemId: userA.desiredItem.id }));
      expect(saved.status).toBe(200);
      const { id } = await saved.json();
      const look = await prisma.look.findFirstOrThrow({ where: { id }, include: { items: true } });
      expect(look.userId).toBe(userA.user.id);
      expect(look.inspiredByDesiredItemId).toBe(userA.desiredItem.id);
      expect(look.items.map((i) => i.wardrobeItemId)).toEqual([userA.wardrobeItem.id]);

      const empty = await POST(json("POST", { placements: [] }));
      expect(await empty.json()).toEqual({ id: null });
      expect(await prisma.look.count({ where: { userId: userA.user.id } })).toBe(1);
    },
    SLOW
  );

  it(
    "rejects another user's wardrobe item or wanted item with a 400, and writes nothing",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA, userB } = fixture;
      signInAs(userA.user.id);

      const foreignPiece = await POST(json("POST", { placements: [piece(userA.wardrobeItem.id), piece(userB.wardrobeItem.id, 1)] }));
      expect(foreignPiece.status).toBe(400);
      expect(await foreignPiece.json()).toEqual({ error: "foreign_item" });

      const foreignWanted = await POST(
        json("POST", { placements: [piece(userA.wardrobeItem.id)], inspiredByDesiredItemId: userB.desiredItem.id })
      );
      expect(foreignWanted.status).toBe(400);

      expect(await prisma.look.count({ where: { userId: { in: [userA.user.id, userB.user.id] } } })).toBe(0);
    },
    SLOW
  );

  it(
    "treats another user's look as not found for replace, rename and delete",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA, userB } = fixture;
      const bLook = (await saveLook(userB.user.id, { placements: [piece(userB.wardrobeItem.id)] }))!;
      signInAs(userA.user.id);

      expect((await PUT(json("PUT", { placements: [piece(userA.wardrobeItem.id)] }), ctx(bLook))).status).toBe(404);
      expect((await PATCH(json("PATCH", { name: "Mine now" }), ctx(bLook))).status).toBe(404);
      expect((await DELETE(json("DELETE", {}), ctx(bLook))).status).toBe(404);

      const untouched = await prisma.look.findUniqueOrThrow({ where: { id: bLook }, include: { items: true } });
      expect(untouched.name).toBe("Look 01");
      expect(untouched.items.map((i) => i.wardrobeItemId)).toEqual([userB.wardrobeItem.id]);
    },
    SLOW
  );

  it(
    "lets the owner replace, rename and delete",
    async () => {
      fixture = await createTwoTenantFixture();
      const { userA } = fixture;
      signInAs(userA.user.id);
      const second = await prisma.wardrobeItem.create({
        data: { userId: userA.user.id, itemName: "Second", category: "tops", status: "active" },
      });
      const id = (await (await POST(json("POST", { placements: [piece(userA.wardrobeItem.id)] }))).json()).id as string;

      expect((await PUT(json("PUT", { placements: [piece(second.id)], name: "Dinner" }), ctx(id))).status).toBe(200);
      const replaced = await prisma.look.findUniqueOrThrow({ where: { id }, include: { items: true } });
      expect([replaced.name, replaced.items.map((i) => i.wardrobeItemId)]).toEqual(["Dinner", [second.id]]);

      expect((await PATCH(json("PATCH", { name: "Dinner out" }), ctx(id))).status).toBe(200);
      expect((await prisma.look.findUniqueOrThrow({ where: { id } })).name).toBe("Dinner out");
      expect((await PATCH(json("PATCH", { name: "   " }), ctx(id))).status).toBe(400);

      expect((await DELETE(json("DELETE", {}), ctx(id))).status).toBe(200);
      expect(await prisma.look.findUnique({ where: { id } })).toBeNull();
    },
    SLOW
  );
});
