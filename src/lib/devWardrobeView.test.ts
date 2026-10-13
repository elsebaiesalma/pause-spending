import { describe, expect, it } from "vitest";
import { devWardrobeBanner, devWardrobeView, devWardrobeWhere } from "./devWardrobeView";

describe("devWardrobeView", () => {
  it("is 'all' when the variable is unset, empty or not one of the three values", () => {
    expect(devWardrobeView({ NODE_ENV: "development" })).toBe("all");
    expect(devWardrobeView({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "" })).toBe("all");
    expect(devWardrobeView({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "everything" })).toBe("all");
    expect(devWardrobeView({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "all" })).toBe("all");
  });

  it("reads seed and real, ignoring case and stray spaces", () => {
    expect(devWardrobeView({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "seed" })).toBe("seed");
    expect(devWardrobeView({ NODE_ENV: "development", DEV_WARDROBE_VIEW: " Seed " })).toBe("seed");
    expect(devWardrobeView({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "REAL" })).toBe("real");
  });

  it("also works under test and when NODE_ENV is not set at all", () => {
    expect(devWardrobeView({ NODE_ENV: "test", DEV_WARDROBE_VIEW: "seed" })).toBe("seed");
    expect(devWardrobeView({ DEV_WARDROBE_VIEW: "seed" })).toBe("seed");
  });
});

describe("devWardrobeWhere", () => {
  it("filters to seed rows, to real rows (no source), or not at all", () => {
    expect(devWardrobeWhere({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "seed" })).toEqual({ source: "seed" });
    expect(devWardrobeWhere({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "real" })).toEqual({ source: null });
    expect(devWardrobeWhere({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "all" })).toEqual({});
    expect(devWardrobeWhere({ NODE_ENV: "development" })).toEqual({});
  });
});

describe("devWardrobeBanner", () => {
  it("says what is being shown while a filter is on, and nothing otherwise", () => {
    expect(devWardrobeBanner({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "seed" })).toBe("Showing seed items only");
    expect(devWardrobeBanner({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "real" })).toBe("Showing real items only");
    expect(devWardrobeBanner({ NODE_ENV: "development" })).toBeNull();
    expect(devWardrobeBanner({ NODE_ENV: "development", DEV_WARDROBE_VIEW: "all" })).toBeNull();
  });
});

describe("in production it does nothing, whatever the variable says", () => {
  for (const value of ["seed", "real", "all", "Seed", " seed ", "nonsense"]) {
    it(`DEV_WARDROBE_VIEW=${JSON.stringify(value)}`, () => {
      const env = { NODE_ENV: "production", DEV_WARDROBE_VIEW: value };
      expect(devWardrobeView(env)).toBe("all");
      expect(devWardrobeWhere(env)).toEqual({});
      expect(devWardrobeBanner(env)).toBeNull();
    });
  }
});
