import { describe, expect, it } from "vitest";
import { toastMessageFor } from "./ActionToast";

describe("toastMessageFor", () => {
  it("confirms each decision in plain words", () => {
    expect(toastMessageFor("?done=let-go")).toBe("Let go. It's on your let-go list.");
    expect(toastMessageFor("?done=undecided")).toBe("Moved to Undecided. Come back to it any time.");
  });

  it("confirms a saved or removed goal, but leaves goal errors to the form", () => {
    expect(toastMessageFor("?goal=saved")).toBe("Goal saved.");
    expect(toastMessageFor("?goal=removed")).toBe("Goal removed.");
    expect(toastMessageFor("?goal=invalid")).toBeNull();
  });

  it("shows nothing for an unknown or missing marker", () => {
    expect(toastMessageFor("?done=whatever")).toBeNull();
    expect(toastMessageFor("")).toBeNull();
  });
});
