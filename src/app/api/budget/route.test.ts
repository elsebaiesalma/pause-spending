import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({ requireUserId: vi.fn(async () => "u1") }));
vi.mock("@/lib/budget", () => ({
  currentMonthKey: () => "2026-11",
  setBudgetForMonth: vi.fn(async () => undefined),
  removeBudgetForMonth: vi.fn(async () => undefined),
}));

import { removeBudgetForMonth, setBudgetForMonth } from "@/lib/budget";
import { POST } from "./route";

function post(fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return POST(new NextRequest("http://localhost:3000/api/budget", { method: "POST", body }));
}

describe("POST /api/budget", () => {
  afterEach(() => {
    vi.mocked(setBudgetForMonth).mockClear();
    vi.mocked(removeBudgetForMonth).mockClear();
  });

  it("sets this month's plan for the signed-in user and returns where it came from", async () => {
    const res = await post({ amount: "250", returnTo: "/dashboard" });
    expect(setBudgetForMonth).toHaveBeenCalledWith("u1", "2026-11", 250);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("turns the plan off for this month only, for the signed-in user", async () => {
    const res = await post({ intent: "off" });
    expect(removeBudgetForMonth).toHaveBeenCalledWith("u1", "2026-11");
    expect(setBudgetForMonth).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("http://localhost:3000/budget");
  });

  it("ignores a returnTo that leaves the site", async () => {
    const res = await post({ amount: "100", returnTo: "https://evil.example/" });
    expect(new URL(res.headers.get("location")!).origin).toBe("http://localhost:3000");
  });

  it("rejects a negative amount", async () => {
    const res = await post({ amount: "-5" });
    expect(res.status).toBe(400);
    expect(setBudgetForMonth).not.toHaveBeenCalled();
  });
});
