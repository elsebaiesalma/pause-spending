import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import {
  ForeignItemError,
  LookNotFoundError,
  deleteEmptyLooks,
  deleteLook,
  getLook,
  hasLookForDesiredItem,
  listLooks,
  renameLook,
  saveLook,
} from "./looks";

const SLOW = 60_000;

function place(wardrobeItemId: string, zOrder = 0) {
  return { wardrobeItemId, x: 0.2, y: 0.2, scale: 0.4, zOrder };
}

describe("looks", () => {
  let fixture: TwoTenantFixture | undefined;

  afterEach(async () => {
    await fixture?.cleanup();
    fixture = undefined;
  });

  describe("cross-tenant isolation", () => {
    it(
      "lists, reads, renames and deletes only the signed-in user's looks",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA, userB } = fixture;
        const aLook = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id)] });
        const bLook = await saveLook(userB.user.id, { placements: [place(userB.wardrobeItem.id)] });

        expect((await listLooks(userA.user.id)).map((l) => l.id)).toEqual([aLook]);
        expect((await listLooks(userB.user.id)).map((l) => l.id)).toEqual([bLook]);

        expect(await getLook(userA.user.id, bLook!)).toBeNull();
        await expect(renameLook(userA.user.id, bLook!, "Mine now")).rejects.toBeInstanceOf(LookNotFoundError);
        await expect(deleteLook(userA.user.id, bLook!)).rejects.toBeInstanceOf(LookNotFoundError);
        await expect(
          saveLook(userA.user.id, { lookId: bLook!, placements: [place(userA.wardrobeItem.id)] })
        ).rejects.toBeInstanceOf(LookNotFoundError);

        const untouched = await getLook(userB.user.id, bLook!);
        expect(untouched?.name).toBe("Look 01");
        expect(untouched?.pieces.map((p) => p.wardrobeItemId)).toEqual([userB.wardrobeItem.id]);
      },
      SLOW
    );

    it(
      "rejects another user's wardrobe item, and another user's wanted item",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA, userB } = fixture;

        await expect(
          saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id), place(userB.wardrobeItem.id, 1)] })
        ).rejects.toBeInstanceOf(ForeignItemError);
        await expect(
          saveLook(userA.user.id, {
            placements: [place(userA.wardrobeItem.id)],
            inspiredByDesiredItemId: userB.desiredItem.id,
          })
        ).rejects.toBeInstanceOf(ForeignItemError);

        expect(await prisma.look.count({ where: { userId: userA.user.id } })).toBe(0);
      },
      SLOW
    );

    it(
      "is enforced by the database too: a piece cannot sit in another user's look",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA, userB } = fixture;
        const aLook = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id)] });

        // Owner says A, look is A's, piece is B's: the composite key refuses.
        await expect(
          prisma.lookItem.create({
            data: { lookId: aLook!, userId: userA.user.id, wardrobeItemId: userB.wardrobeItem.id, x: 0, y: 0, scale: 0.3 },
          })
        ).rejects.toThrow();
        // Owner says B, but the look is A's: refused as well.
        await expect(
          prisma.lookItem.create({
            data: { lookId: aLook!, userId: userB.user.id, wardrobeItemId: userB.wardrobeItem.id, x: 0, y: 0, scale: 0.3 },
          })
        ).rejects.toThrow();
      },
      SLOW
    );
  });

  describe("saving", () => {
    it(
      "stores ids and positions, names looks in order, and replaces the pieces on a re-save",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA } = fixture;
        const second = await prisma.wardrobeItem.create({
          data: { userId: userA.user.id, itemName: "Second Piece", category: "tops", status: "active" },
        });

        const first = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id)] });
        const next = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id), { ...place(second.id, 1), x: 0.5 }] });
        expect((await getLook(userA.user.id, first!))?.name).toBe("Look 01");
        expect((await getLook(userA.user.id, next!))?.name).toBe("Look 02");
        expect((await getLook(userA.user.id, next!))?.pieces.map((p) => [p.wardrobeItemId, p.x, p.zOrder])).toEqual([
          [userA.wardrobeItem.id, 0.2, 0],
          [second.id, 0.5, 1],
        ]);

        await saveLook(userA.user.id, { lookId: next!, placements: [{ ...place(second.id), x: 0.7 }] });
        const resaved = await getLook(userA.user.id, next!);
        expect(resaved?.pieces.map((p) => [p.wardrobeItemId, p.x])).toEqual([[second.id, 0.7]]);
      },
      SLOW
    );

    it(
      "does not save an empty board, and saving one removes the look it was editing",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA } = fixture;
        expect(await saveLook(userA.user.id, { placements: [] })).toBeNull();
        expect(await prisma.look.count({ where: { userId: userA.user.id } })).toBe(0);

        const id = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id)] });
        expect(await saveLook(userA.user.id, { lookId: id!, placements: [] })).toBeNull();
        expect(await getLook(userA.user.id, id!)).toBeNull();
      },
      SLOW
    );
  });

  describe("a look whose pieces are all deleted", () => {
    it(
      "disappears from the list and is deleted, while a look with a piece left stays",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA } = fixture;
        const keep = await prisma.wardrobeItem.create({
          data: { userId: userA.user.id, itemName: "Keeper", category: "tops", status: "active" },
        });
        const onlyGone = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id)] });
        const mixed = await saveLook(userA.user.id, {
          placements: [place(userA.wardrobeItem.id), place(keep.id, 1)],
        });

        // Deleting the wardrobe item removes it from every look (cascade).
        await prisma.wardrobeItem.delete({ where: { id: userA.wardrobeItem.id } });
        expect(await prisma.look.findUnique({ where: { id: onlyGone! } })).not.toBeNull();

        const listed = await listLooks(userA.user.id);
        expect(listed.map((l) => l.id)).toEqual([mixed]);
        expect(listed[0].pieces.map((p) => p.wardrobeItemId)).toEqual([keep.id]);
        expect(await prisma.look.findUnique({ where: { id: onlyGone! } })).toBeNull();
      },
      SLOW
    );

    it(
      "deleteEmptyLooks only touches the given user's empty looks",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA, userB } = fixture;
        const aLook = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id)] });
        const bLook = await saveLook(userB.user.id, { placements: [place(userB.wardrobeItem.id)] });
        await prisma.lookItem.deleteMany({ where: { lookId: { in: [aLook!, bLook!] } } });

        expect(await deleteEmptyLooks(userA.user.id)).toBe(1);
        expect(await prisma.look.findUnique({ where: { id: bLook! } })).not.toBeNull();
      },
      SLOW
    );
  });

  describe("Built instead of", () => {
    it(
      "names the wanted item as text, and disappears gracefully once that item is gone",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA } = fixture;
        const id = await saveLook(userA.user.id, {
          placements: [place(userA.wardrobeItem.id)],
          inspiredByDesiredItemId: userA.desiredItem.id,
        });

        expect((await getLook(userA.user.id, id!))?.builtInstead).toBe("Tenant A Blazer");
        expect(await hasLookForDesiredItem(userA.user.id, userA.desiredItem.id)).toBe(true);

        await prisma.desiredItem.delete({ where: { id: userA.desiredItem.id } });

        const after = await getLook(userA.user.id, id!);
        expect(after).not.toBeNull();
        expect(after?.builtInstead).toBeNull();
        expect(after?.inspiredByDesiredItemId).toBeNull();
        expect((await listLooks(userA.user.id)).map((l) => l.id)).toEqual([id]);
      },
      SLOW
    );

    it(
      "shows no line for a wanted item with no name, and none for a look built from nothing",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA } = fixture;
        await prisma.desiredItem.update({ where: { id: userA.desiredItem.id }, data: { itemName: null } });
        const unnamed = await saveLook(userA.user.id, {
          placements: [place(userA.wardrobeItem.id)],
          inspiredByDesiredItemId: userA.desiredItem.id,
        });
        const plain = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id)] });

        expect((await getLook(userA.user.id, unnamed!))?.builtInstead).toBeNull();
        expect((await getLook(userA.user.id, plain!))?.builtInstead).toBeNull();
      },
      SLOW
    );
  });

  describe("deleting an account", () => {
    it(
      "removes the user's looks and their pieces with them",
      async () => {
        fixture = await createTwoTenantFixture();
        const { userA, userB } = fixture;
        const aLook = await saveLook(userA.user.id, { placements: [place(userA.wardrobeItem.id)] });
        const bLook = await saveLook(userB.user.id, { placements: [place(userB.wardrobeItem.id)] });

        await prisma.user.delete({ where: { id: userA.user.id } });

        expect(await prisma.look.findUnique({ where: { id: aLook! } })).toBeNull();
        expect(await prisma.lookItem.count({ where: { lookId: aLook! } })).toBe(0);
        expect(await prisma.look.findUnique({ where: { id: bLook! } })).not.toBeNull();
      },
      SLOW
    );
  });
});
