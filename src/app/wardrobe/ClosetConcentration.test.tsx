import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClosetConcentration, tintsByCount } from "./ClosetConcentration";

const row = (key: string, count: number, wellStocked: boolean) => ({
  key,
  label: key,
  count,
  share: 0,
  wellStocked,
  sentence: wellStocked ? "3 similar white tops" : null,
});

describe("tintsByCount", () => {
  it("gives the highest count the darkest shade, equal counts one shade, and each lower count a lighter one", () => {
    const tints = tintsByCount([5, 5, 4, 4, 3, 3, 3]);
    expect(tints.get(5)).toBe(1);
    expect(tints.get(4)).toBeLessThan(tints.get(5)!);
    expect(tints.get(3)).toBeLessThan(tints.get(4)!);
    expect(tints.size).toBe(3);
  });

  it("never goes lighter than the floor", () => {
    const tints = tintsByCount([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(Math.min(...tints.values())).toBeGreaterThanOrEqual(0.35);
  });
});

describe("ClosetConcentration", () => {
  it("shades equal counts the same, and says the warning in words rather than a different colour", () => {
    const html = renderToStaticMarkup(
      <ClosetConcentration rows={[row("Tops", 5, true), row("Bottoms", 5, false), row("Shoes", 4, false)]} />
    );
    expect(html).toContain("3 similar white tops");
    expect(html).not.toMatch(/rose|warn/i);
    expect(html).toContain("Tops: 5 of 14 pieces");
    const tints = [...html.matchAll(/--tint:([0-9.]+)/g)].map((m) => m[1]);
    expect(tints).toEqual(["1", "1", "0.8"]);
  });
});
