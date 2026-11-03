import { describe, expect, it } from "vitest";
import { itemStatus, parseDecisionsTab } from "./itemStatus";

const base = { userConfirmed: true, pauseStatus: "pending_confirmation", decisionOutcome: null, storeVisitAnswer: null };

describe("itemStatus", () => {
  it("gives every lifecycle state exactly one status", () => {
    expect(itemStatus({ ...base, userConfirmed: false })).toBe("draft");
    expect(itemStatus(base)).toBe("deciding");
    expect(itemStatus({ ...base, pauseStatus: "waiting" })).toBe("paused");
    expect(itemStatus({ ...base, pauseStatus: "saved_for_later" })).toBe("undecided");
    expect(itemStatus({ ...base, pauseStatus: "proceeded", decisionOutcome: "dropped" })).toBe("let_go");
    expect(itemStatus({ ...base, pauseStatus: "proceeded", decisionOutcome: "proceeded" })).toBe("still_want");
    expect(itemStatus({ ...base, pauseStatus: "proceeded", decisionOutcome: "proceeded", storeVisitAnswer: "bought" })).toBe(
      "bought"
    );
  });

  it("keeps a store visit answered 'Not sure yet' in Undecided", () => {
    expect(
      itemStatus({ ...base, pauseStatus: "proceeded", decisionOutcome: "proceeded", storeVisitAnswer: "not_sure" })
    ).toBe("undecided");
  });
});

describe("parseDecisionsTab", () => {
  it("falls back to On pause for anything unknown", () => {
    expect(parseDecisionsTab("let-go")).toBe("let-go");
    expect(parseDecisionsTab(["bought"])).toBe("bought");
    expect(parseDecisionsTab("nope")).toBe("paused");
    expect(parseDecisionsTab(undefined)).toBe("paused");
  });
});
