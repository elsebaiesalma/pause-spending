import { describe, expect, it } from "vitest";
import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("redirects to the Account page", () => {
    expect(() => SettingsPage()).toThrow(/NEXT_REDIRECT/);
  });
});
