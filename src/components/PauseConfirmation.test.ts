import { describe, expect, it } from "vitest";
import { parsePausedUntil } from "./PauseConfirmation";

const now = new Date("2026-10-13T10:00:00Z");

describe("parsePausedUntil", () => {
  it("reads a future wait_until from the query string", () => {
    expect(parsePausedUntil("?paused=2026-10-14T10:00:00.000Z", now)?.toISOString()).toBe("2026-10-14T10:00:00.000Z");
  });

  it("ignores missing, malformed, past and far-future values", () => {
    expect(parsePausedUntil("", now)).toBeNull();
    expect(parsePausedUntil("?paused=soon", now)).toBeNull();
    expect(parsePausedUntil("?paused=2026-10-12T10:00:00.000Z", now)).toBeNull();
    expect(parsePausedUntil("?paused=2030-01-01T00:00:00.000Z", now)).toBeNull();
  });
});
