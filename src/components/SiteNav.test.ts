import { describe, expect, it } from "vitest";
import { isActive } from "./SiteNav";

const decisions = { href: "/considering", label: "Decisions", match: ["/considering", "/desired-items"] } as const;

describe("isActive", () => {
  it("highlights Decisions on its own pages and on an item's page", () => {
    expect(isActive("/considering", decisions)).toBe(true);
    expect(isActive("/desired-items/abc", decisions)).toBe(true);
  });

  it("highlights no tab while adding an item or deciding on it", () => {
    for (const path of [
      "/desired-items/new",
      "/desired-items/abc/confirm",
      "/desired-items/abc/pause",
      "/desired-items/abc/still-want-it",
    ]) {
      expect(isActive(path, decisions)).toBe(false);
    }
  });
});
