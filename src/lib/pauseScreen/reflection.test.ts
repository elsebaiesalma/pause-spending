import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  REFLECTION_NOTHING_VALUE,
  hasAnyReflectionAnswer,
  parseReflectionFromForm,
  saveReflectionAnswer,
  getReflectionAnswer,
} from "./reflection";

describe("hasAnyReflectionAnswer / parseReflectionFromForm", () => {
  it("is false and null for a completely blank form", () => {
    const form = new FormData();
    expect(hasAnyReflectionAnswer(form)).toBe(false);
    expect(parseReflectionFromForm(form)).toBeNull();
  });

  it("parses an explicit 'nothing, it's new to me' answer", () => {
    const form = new FormData();
    form.set("reflectionReplaces", REFLECTION_NOTHING_VALUE);
    expect(hasAnyReflectionAnswer(form)).toBe(true);
    expect(parseReflectionFromForm(form)).toEqual({
      replacesWardrobeItemId: null,
      replacesNothing: true,
      needScore: null,
      reasonFor: null,
      reasonAgainst: null,
    });
  });

  it("parses a chosen wardrobe item, need score, and reasons", () => {
    const form = new FormData();
    form.set("reflectionReplaces", "item-123");
    form.set("reflectionNeedScore", "5");
    form.set("reflectionReasonFor", "  It's for a wedding  ");
    form.set("reflectionReasonAgainst", "");
    expect(parseReflectionFromForm(form)).toEqual({
      replacesWardrobeItemId: "item-123",
      replacesNothing: false,
      needScore: 5,
      reasonFor: "It's for a wedding",
      reasonAgainst: null,
    });
  });

  it("drops a need score outside 1-7", () => {
    const form = new FormData();
    form.set("reflectionNeedScore", "12");
    expect(parseReflectionFromForm(form)?.needScore).toBeNull();
  });

  it("is true from a reason alone, with no chip or score picked", () => {
    const form = new FormData();
    form.set("reflectionReasonAgainst", "too similar to what I have");
    expect(hasAnyReflectionAnswer(form)).toBe(true);
  });
});

describe("saveReflectionAnswer / getReflectionAnswer (pending migration)", () => {
  it("degrade to a no-op and null rather than throwing, since the migration isn't applied yet", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const desired = await prisma.desiredItem.create({
      data: { userId: user.id, sourceType: "typed", itemName: "Test Item" },
    });

    try {
      await expect(
        saveReflectionAnswer(desired.id, user.id, {
          replacesWardrobeItemId: null,
          replacesNothing: true,
          needScore: 4,
          reasonFor: null,
          reasonAgainst: null,
        })
      ).resolves.toBeUndefined();

      await expect(getReflectionAnswer(desired.id, user.id)).resolves.toBeNull();
    } finally {
      await prisma.desiredItem.deleteMany({ where: { id: desired.id } });
    }
  });
});
