import { describe, expect, it } from "vitest";
import { partOfDay } from "./LocalGreeting";

describe("partOfDay", () => {
  it("says evening after midnight, morning from 5am, afternoon from noon, evening from 6pm", () => {
    expect(partOfDay(0)).toBe("evening");
    expect(partOfDay(4)).toBe("evening");
    expect(partOfDay(5)).toBe("morning");
    expect(partOfDay(12)).toBe("afternoon");
    expect(partOfDay(18)).toBe("evening");
  });
});
