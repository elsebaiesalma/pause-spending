import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/oauth/google", () => ({
  exchangeCodeForTokens: vi.fn(),
  buildGoogleAuthorizationUrl: (state: string) =>
    `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { exchangeCodeForTokens } from "@/lib/oauth/google";
import { auth } from "@/lib/auth";
import { GET } from "./route";

function buildRequest() {
  return new NextRequest("http://localhost:3000/api/auth/gmail/start");
}

describe("GET /api/auth/gmail/start", () => {
  afterEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("redirects to /login without touching Google when there's no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await GET(buildRequest());

    expect(response.headers.get("location")).toContain("/login");
    expect(exchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it("redirects straight to Google without exchanging any code", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as never);

    const response = await GET(buildRequest());

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toContain("accounts.google.com");
    expect(exchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it("sets an httpOnly state cookie used to verify the callback", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as never);

    const response = await GET(buildRequest());

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("gmail_oauth_state=");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });
});
