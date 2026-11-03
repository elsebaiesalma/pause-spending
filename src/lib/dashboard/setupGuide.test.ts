import { describe, expect, it } from "vitest";
import { nextStep, setupSteps } from "./setupGuide";

describe("setup guide steps", () => {
  it("opens the first step that isn't done, in order", () => {
    const steps = setupSteps({ addedItem: true, madeDecision: false, builtLook: true });
    expect(steps.map((s) => s.done)).toEqual([true, false, true]);
    expect(nextStep(steps)?.id).toBe("madeDecision");
  });

  it("has nothing left to open once every step is done", () => {
    expect(nextStep(setupSteps({ addedItem: true, madeDecision: true, builtLook: true }))).toBeNull();
  });

  it("starts at adding an item for a new account", () => {
    expect(nextStep(setupSteps({ addedItem: false, madeDecision: false, builtLook: false }))?.id).toBe("addedItem");
  });
});
