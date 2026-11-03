import { describe, expect, it } from "vitest";
import { toastMessageFor } from "./ActionToast";

describe("toastMessageFor", () => {
  it("confirms each decision in plain words", () => {
    expect(toastMessageFor("?done=let-go")).toBe("Let go. It's on your let-go list.");
    expect(toastMessageFor("?done=undecided")).toBe("Moved to Undecided. Come back to it any time.");
  });

  it("shows nothing for an unknown or missing marker", () => {
    expect(toastMessageFor("?done=whatever")).toBeNull();
    expect(toastMessageFor("")).toBeNull();
  });
});
