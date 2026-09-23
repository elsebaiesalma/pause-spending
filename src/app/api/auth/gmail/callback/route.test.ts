import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/oauth/google", async () => {
  const actual = await vi.importActual<typeof import("@/lib/oauth/google")>(
    "@/lib/oauth/google"
  );
  return {
    ...actual,
    exchangeCodeForTokens: vi.fn(),
  };
});

import { exchangeCodeForTokens } from "@/lib/oauth/google";
import { decrypt, type EncryptedEnvelope } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const FAKE_TOKENS = {
  access_token: "fake-access-token-value",
  refresh_token: "fake-refresh-token-value",
  expires_in: 3600,
  scope: "https://www.googleapis.com/auth/gmail.readonly",
  token_type: "Bearer",
};

function buildRequest(params: { code?: string; state?: string; cookieState?: string }) {
  const url = new URL("http://localhost:3000/api/auth/gmail/callback");
  if (params.code) url.searchParams.set("code", params.code);
  if (params.state) url.searchParams.set("state", params.state);

  const headers = new Headers();
  if (params.cookieState) {
    headers.set("cookie", `gmail_oauth_state=${params.cookieState}`);
  }

  return new NextRequest(url, { headers });
}

describe("GET /api/auth/gmail/callback", () => {
  afterEach(async () => {
    vi.mocked(exchangeCodeForTokens).mockReset();
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.emailConnection.deleteMany({ where: { userId: user.id, provider: "gmail" } });
    }
  });

  it("rejects a mismatched state without exchanging any code", async () => {
    const request = buildRequest({ code: "abc", state: "one", cookieState: "two" });

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(exchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it("stores the token encrypted (never in plaintext) and it decrypts back to the original", async () => {
    vi.mocked(exchangeCodeForTokens).mockResolvedValueOnce(FAKE_TOKENS);
    const request = buildRequest({ code: "real-code", state: "match", cookieState: "match" });

    const response = await GET(request);

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const user = await prisma.user.findFirstOrThrow();
    const connection = await prisma.emailConnection.findUniqueOrThrow({
      where: { userId_provider: { userId: user.id, provider: "gmail" } },
    });

    expect(connection.status).toBe("connected");

    const serializedRow = JSON.stringify(connection.encryptedToken);
    expect(serializedRow).not.toContain(FAKE_TOKENS.access_token);
    expect(serializedRow).not.toContain(FAKE_TOKENS.refresh_token);

    const decrypted = JSON.parse(
      decrypt(connection.encryptedToken as unknown as EncryptedEnvelope)
    );
    expect(decrypted.accessToken).toBe(FAKE_TOKENS.access_token);
    expect(decrypted.refreshToken).toBe(FAKE_TOKENS.refresh_token);
  });
});
