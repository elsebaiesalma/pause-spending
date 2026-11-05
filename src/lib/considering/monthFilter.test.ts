import { describe, expect, it } from "vitest";
import { inMonth, monthOptions, parseMonthParam, resolveMonth } from "./monthFilter";

describe("parseMonthParam", () => {
  it("accepts a month key and rejects anything else", () => {
    expect(parseMonthParam("2026-11")).toBe("2026-11");
    expect(parseMonthParam(["2026-10", "2026-11"])).toBe("2026-10");
    expect(parseMonthParam("all")).toBe("all");
    expect(parseMonthParam("2026-13")).toBeNull();
    expect(parseMonthParam("november")).toBeNull();
    expect(parseMonthParam(undefined)).toBeNull();
  });
});

describe("resolveMonth", () => {
  it("defaults to the current month on the person's clock, and all means no filter", () => {
    const at = new Date("2026-12-01T03:00:00Z");
    expect(resolveMonth(null, "America/Toronto", at)).toBe("2026-11");
    expect(resolveMonth(null, null, at)).toBe("2026-12");
    expect(resolveMonth("2026-09", "America/Toronto", at)).toBe("2026-09");
    expect(resolveMonth("all", "America/Toronto", at)).toBeNull();
  });
});

describe("inMonth", () => {
  it("keeps everything with no month and filters by UTC month otherwise", () => {
    expect(inMonth(new Date("2026-10-31T23:00:00Z"), null)).toBe(true);
    expect(inMonth(new Date("2026-11-01T00:00:00Z"), "2026-11")).toBe(true);
    expect(inMonth(new Date("2026-10-31T23:59:00Z"), "2026-11")).toBe(false);
    expect(inMonth(new Date("2026-12-01T00:00:00Z"), "2026-11")).toBe(false);
  });
});

describe("monthOptions", () => {
  it("lists months newest first, once each, and keeps the selected one", () => {
    const dates = [new Date("2026-10-05T12:00:00Z"), new Date("2026-11-02T12:00:00Z"), new Date("2026-11-20T12:00:00Z")];
    expect(monthOptions(dates, null).map((o) => o.key)).toEqual(["2026-11", "2026-10"]);
    expect(monthOptions(dates, "2026-09").map((o) => o.key)).toEqual(["2026-11", "2026-10", "2026-09"]);
  });
});
