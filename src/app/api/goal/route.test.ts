import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({ requireUserId: vi.fn(async () => "u1") }));
vi.mock("@/lib/budget", () => ({ currentMonthKey: () => "2026-11" }));
vi.mock("@/lib/goals/savingsGoal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/goals/savingsGoal")>()),
  saveSavingsGoal: vi.fn(async () => true),
  restartSavingsGoal: vi.fn(async () => true),
  removeSavingsGoal: vi.fn(async () => undefined),
}));

import { saveSavingsGoal } from "@/lib/goals/savingsGoal";
import { POST } from "./route";

function post(fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return POST(new NextRequest("http://localhost:3000/api/goal", { method: "POST", body }));
}

describe("POST /api/goal", () => {
  afterEach(() => vi.mocked(saveSavingsGoal).mockClear());

  it("starts a new goal today by default", async () => {
    const res = await post({ intent: "save", name: "Trip", amount: "500" });
    expect(saveSavingsGoal).toHaveBeenCalledWith("u1", { name: "Trip", target: 500 }, undefined);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard?goal=saved");
  });

  it("counts this month's let-go money when asked, by starting the goal on the 1st", async () => {
    await post({ intent: "save", name: "Trip", amount: "$500", countFrom: "month" });
    expect(saveSavingsGoal).toHaveBeenCalledWith("u1", { name: "Trip", target: 500 }, new Date(Date.UTC(2026, 10, 1)));
  });
});
