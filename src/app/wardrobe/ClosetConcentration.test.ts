import { describe, expect, it } from "vitest";
import { toneFor } from "./ClosetConcentration";

describe("toneFor", () => {
  it("uses the accent tone only where there are near-duplicates", () => {
    expect(toneFor({ wellStocked: true })).toBe("rose");
  });

  it("keeps ordinary categories neutral", () => {
    expect(toneFor({ wellStocked: false })).toBe("espresso");
  });
});
