import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/demo", () => ({
  createDemoSession: vi.fn(async () => ({ sessionToken: "tok123", expires: new Date(Date.now() + 86_400_000) })),
}));

import { createDemoSession } from "@/lib/demo";
import { POST } from "./route";

function post(url: string, headers: Record<string, string> = {}) {
  return POST(new NextRequest(url, { method: "POST", headers }));
}

describe("POST /api/demo", () => {
  afterEach(() => vi.mocked(createDemoSession).mockClear());

  it("signs the visitor in and sends them Home", async () => {
    const res = await post("http://localhost:3000/api/demo", { origin: "http://localhost:3000" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
    expect(res.cookies.get("authjs.session-token")?.value).toBe("tok123");
    expect(res.cookies.get("authjs.session-token")?.httpOnly).toBe(true);
  });

  it("uses Auth.js's __Secure- cookie name over https, or auth() would never see the session", async () => {
    const res = await post("https://pause.example/api/demo");
    expect(res.cookies.get("__Secure-authjs.session-token")?.value).toBe("tok123");
    expect(res.cookies.get("authjs.session-token")).toBeUndefined();
  });

  it("refuses posts from other sites and creates nothing", async () => {
    const res = await post("http://localhost:3000/api/demo", { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(createDemoSession).not.toHaveBeenCalled();
  });
});
