import { describe, expect, it } from "vitest";
import { tierFor } from "./ClosetConcentration";

const rows = (...counts: number[]) => counts.map((count) => ({ count })) as never;

describe("tierFor", () => {
  it("colours by rank: top two espresso, next two rose, the rest blush", () => {
    expect(tierFor(rows(9, 7, 5, 4, 3, 1))).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("gives equal counts the same colour, so equal bars never look ranked", () => {
    expect(tierFor(rows(6, 4, 4, 4, 2))).toEqual([0, 0, 0, 0, 2]);
  });
});
