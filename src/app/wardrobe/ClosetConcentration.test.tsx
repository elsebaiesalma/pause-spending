import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClosetConcentration } from "./ClosetConcentration";

const row = (key: string, count: number, wellStocked: boolean) => ({
  key,
  label: key,
  count,
  share: 0,
  wellStocked,
  sentence: wellStocked ? "3 similar white tops" : null,
});

describe("ClosetConcentration", () => {
  it("draws every bar in the same colour, near-duplicates or not, and says the warning in words", () => {
    const html = renderToStaticMarkup(<ClosetConcentration rows={[row("Tops", 5, true), row("Bottoms", 5, false)]} />);
    expect(html).toContain("3 similar white tops");
    expect(html).not.toMatch(/rose|warn/i);
    expect(html).toContain("Tops: 5 of 10 pieces");
    expect(html).toContain("Bottoms: 5 of 10 pieces");
  });
});
