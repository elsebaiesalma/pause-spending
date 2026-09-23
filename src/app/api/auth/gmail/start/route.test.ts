import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/oauth/google", () => ({
  exchangeCodeForTokens: vi.fn(),
  buildGoogleAuthorizationUrl: (state: string) =>
    `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
}));

import { exchangeCodeForTokens } from "@/lib/oauth/google";
import { GET } from "./route";

describe("GET /api/auth/gmail/start", () => {
  it("redirects straight to Google without exchanging any code", async () => {
    const response = await GET();

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toContain("accounts.google.com");
    expect(exchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it("sets an httpOnly state cookie used to verify the callback", async () => {
    const response = await GET();

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("gmail_oauth_state=");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });
});
