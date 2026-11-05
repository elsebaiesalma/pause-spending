import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClosetConcentration, RANK_SHADES, shadesByCount } from "./ClosetConcentration";

const row = (key: string, count: number, wellStocked: boolean) => ({
  key,
  label: key,
  count,
  share: 0,
  wellStocked,
  sentence: wellStocked ? "3 similar white tops" : null,
});

describe("shadesByCount", () => {
  it("gives the highest count the darkest shade, equal counts one shade, and each lower count the next step", () => {
    const shades = shadesByCount([5, 5, 4, 4, 3, 3, 3]);
    expect(shades.get(5)).toBe(RANK_SHADES[0]);
    expect(shades.get(4)).toBe(RANK_SHADES[1]);
    expect(shades.get(3)).toBe(RANK_SHADES[2]);
    expect(shades.size).toBe(3);
  });

  it("repeats the lightest step past the end", () => {
    const shades = shadesByCount([9, 8, 7, 6, 5, 4, 3]);
    expect(shades.get(3)).toBe(RANK_SHADES[RANK_SHADES.length - 1]);
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
    const shades = [...html.matchAll(/background:(#[0-9a-f]{6})/g)].map((m) => m[1]);
    expect(shades).toEqual([RANK_SHADES[0], RANK_SHADES[0], RANK_SHADES[1]]);
  });
});
