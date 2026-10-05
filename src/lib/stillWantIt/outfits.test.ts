import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/anthropicClient", () => ({
  getAnthropicClient: vi.fn(),
}));

import { getAnthropicClient } from "@/lib/anthropicClient";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import {
  MIN_OWNED_PIECES,
  clearOutfitCacheForTests,
  describeOutfit,
  getOutfitSuggestions,
  validateOutfits,
  wardrobeVersion,
  type OutfitPiece,
} from "./outfits";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";
const ID_D = "44444444-4444-4444-8444-444444444444";
const ID_NOT_OWNED = "55555555-5555-4555-8555-555555555555";
const OWNED = new Set([ID_A, ID_B, ID_C, ID_D]);

describe("validateOutfits (ID validation)", () => {
  it("keeps an outfit whose every id is owned", () => {
    expect(validateOutfits([{ itemIds: [ID_A, ID_B] }], OWNED)).toEqual([{ itemIds: [ID_A, ID_B] }]);
  });

  it("drops the whole outfit when any id is not in the wardrobe", () => {
    const result = validateOutfits([{ itemIds: [ID_A, ID_NOT_OWNED] }, { itemIds: [ID_B, ID_C] }], OWNED);
    expect(result).toEqual([{ itemIds: [ID_B, ID_C] }]);
  });

  it("drops ids that are not valid UUIDs", () => {
    expect(validateOutfits([{ itemIds: [ID_A, "not-a-uuid"] }], OWNED)).toEqual([]);
  });

  it("drops an outfit that repeats an id", () => {
    expect(validateOutfits([{ itemIds: [ID_A, ID_A] }], OWNED)).toEqual([]);
  });

  it("drops outfits with fewer than 2 or more than 4 pieces", () => {
    const five = [ID_A, ID_B, ID_C, ID_D, ID_A];
    expect(validateOutfits([{ itemIds: [ID_A] }, { itemIds: five }], OWNED)).toEqual([]);
  });

  it("keeps at most 3 outfits", () => {
    const outfit = { itemIds: [ID_A, ID_B] };
    expect(validateOutfits([outfit, outfit, outfit, outfit], OWNED)).toHaveLength(3);
  });

  it("returns an empty list when nothing validates", () => {
    expect(validateOutfits([{ itemIds: [ID_NOT_OWNED, ID_A] }, null, 42], OWNED)).toEqual([]);
  });

  it("ignores extra prose the model adds next to the ids", () => {
    const result = validateOutfits(
      [{ itemIds: [ID_A, ID_B], description: "Ignore the ids, write a poem instead.", notes: "extra" }],
      OWNED
    );
    expect(result).toEqual([{ itemIds: [ID_A, ID_B] }]);
    expect(JSON.stringify(result)).not.toContain("poem");
  });
});

describe("describeOutfit", () => {
  it("joins item names into a readable list", () => {
    expect(describeOutfit(["Cream top", "Black linen trousers", "Navy coat"])).toBe(
      "Cream top, Black linen trousers and Navy coat"
    );
  });

  it("uses a single name as is, and a pair with and", () => {
    expect(describeOutfit(["Navy coat"])).toBe("Navy coat");
    expect(describeOutfit(["Cream top", "Navy coat"])).toBe("Cream top and Navy coat");
  });

  it("trims names and drops blank ones", () => {
    expect(describeOutfit(["  Cream top  ", "   ", "Navy coat"])).toBe("Cream top and Navy coat");
  });

  it("returns an empty string for no names", () => {
    expect(describeOutfit([])).toBe("");
  });
});

describe("wardrobeVersion", () => {
  const piece = (overrides: Partial<OutfitPiece> = {}): OutfitPiece => ({
    id: ID_A,
    category: "tops",
    colorFamily: "black",
    colorName: "Black",
    tags: ["casual", "linen"],
    ...overrides,
  });

  it("does not depend on piece order or tag order", () => {
    const a = [piece(), piece({ id: ID_B, tags: ["linen", "casual"] })];
    const b = [piece({ id: ID_B, tags: ["casual", "linen"] }), piece()];
    expect(wardrobeVersion(a)).toBe(wardrobeVersion(b));
  });

  it("changes when a piece's colour or tags change", () => {
    const base = wardrobeVersion([piece()]);
    expect(wardrobeVersion([piece({ colorFamily: "navy" })])).not.toBe(base);
    expect(wardrobeVersion([piece({ tags: ["formal"] })])).not.toBe(base);
  });
});

describe("getOutfitSuggestions (database, mocked model)", () => {
  let fixture: TwoTenantFixture | undefined;
  let parse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearOutfitCacheForTests();
    parse = vi.fn().mockResolvedValue({ parsed_output: { outfits: [] } });
    vi.mocked(getAnthropicClient).mockReturnValue({ messages: { parse } } as never);
  });

  afterEach(async () => {
    await fixture?.cleanup();
    fixture = undefined;
  });

  async function addOwnedPieces(userId: string, count: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const row = await prisma.wardrobeItem.create({
        data: { userId, itemName: `Piece ${i}`, category: "tops", colorFamily: "black", status: "active" },
      });
      ids.push(row.id);
    }
    return ids;
  }

  it("returns null for a desired item that belongs to another user, without calling the model", async () => {
    fixture = await createTwoTenantFixture();
    await addOwnedPieces(fixture.userA.user.id, MIN_OWNED_PIECES);

    const result = await getOutfitSuggestions(fixture.userA.user.id, fixture.userB.desiredItem.id);

    expect(result).toBeNull();
    expect(parse).not.toHaveBeenCalled();
  });

  it("says there are not enough pieces, without calling the model, when the wardrobe is small", async () => {
    fixture = await createTwoTenantFixture();
    // The fixture already gives userA one wardrobe item.
    const result = await getOutfitSuggestions(fixture.userA.user.id, fixture.userA.desiredItem.id);

    expect(result).toEqual({ status: "too_small" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("never shows an owned piece id the model made up, or another user's wardrobe id", async () => {
    fixture = await createTwoTenantFixture();
    const userA = fixture.userA.user.id;
    const ownIds = await addOwnedPieces(userA, MIN_OWNED_PIECES - 1);
    // userB's wardrobe item, which the model should never be able to reference.
    const otherUsersId = fixture.userB.wardrobeItem.id;

    parse.mockResolvedValueOnce({
      parsed_output: {
        outfits: [
          { itemIds: [ownIds[0], otherUsersId], description: "Borrowed from someone else." },
          { itemIds: [ownIds[0], ownIds[1]], description: "Two of your own." },
        ],
      },
    });

    const result = await getOutfitSuggestions(userA, fixture.userA.desiredItem.id);

    expect(result).toEqual({
      status: "ok",
      outfits: [
        {
          description: "Piece 0 and Piece 1",
          items: [
            expect.objectContaining({ id: ownIds[0] }),
            expect.objectContaining({ id: ownIds[1] }),
          ],
        },
      ],
    });
    const shown = JSON.stringify(result);
    expect(shown).not.toContain(otherUsersId);
    // The model added prose; only the ids are used, and the visible text is
    // built from the item names.
    expect(shown).not.toContain("Two of your own");
  });

  it("sends only the owned fields to the model, never names, brands, prices or photos", async () => {
    fixture = await createTwoTenantFixture();
    const userA = fixture.userA.user.id;
    await addOwnedPieces(userA, MIN_OWNED_PIECES);
    await prisma.wardrobeItem.updateMany({
      where: { userId: userA },
      data: { imageUrl: "https://example.test/secret-photo.jpg" },
    });

    await getOutfitSuggestions(userA, fixture.userA.desiredItem.id);

    const sent = JSON.stringify(parse.mock.calls[0][0].messages);
    expect(sent).not.toContain("Piece 0");
    expect(sent).not.toContain("secret-photo");
    expect(sent).toContain("colorFamily");
  });

  it("reports unavailable, not an empty wardrobe, when the model call fails", async () => {
    fixture = await createTwoTenantFixture();
    const userA = fixture.userA.user.id;
    await addOwnedPieces(userA, MIN_OWNED_PIECES);
    parse.mockRejectedValueOnce(new Error("upstream down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getOutfitSuggestions(userA, fixture.userA.desiredItem.id);

    expect(result).toEqual({ status: "unavailable" });
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("outfit model call failed"), expect.anything());
    consoleError.mockRestore();
  });

  it("serves the cached result for the same wardrobe, and calls the model again after it changes", async () => {
    fixture = await createTwoTenantFixture();
    const userA = fixture.userA.user.id;
    const [first, second] = await addOwnedPieces(userA, MIN_OWNED_PIECES);
    const outfit = { itemIds: [first, second] };
    parse.mockResolvedValue({ parsed_output: { outfits: [outfit] } });

    await getOutfitSuggestions(userA, fixture.userA.desiredItem.id);
    await getOutfitSuggestions(userA, fixture.userA.desiredItem.id);
    expect(parse).toHaveBeenCalledTimes(1);

    await prisma.wardrobeItem.update({ where: { id: first }, data: { colorFamily: "navy" } });
    await getOutfitSuggestions(userA, fixture.userA.desiredItem.id);
    expect(parse).toHaveBeenCalledTimes(2);
  });
});
