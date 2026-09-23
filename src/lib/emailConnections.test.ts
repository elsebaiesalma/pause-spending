import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/oauth/google", async () => {
  const actual = await vi.importActual<typeof import("@/lib/oauth/google")>("@/lib/oauth/google");
  return { ...actual, refreshGoogleAccessToken: vi.fn() };
});

import { GoogleTokenExpiredError, refreshGoogleAccessToken } from "@/lib/oauth/google";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { GmailConnectionExpiredError, getValidGmailAccessToken } from "./emailConnections";

describe("getValidGmailAccessToken", () => {
  const createdConnectionIds: string[] = [];

  afterEach(async () => {
    vi.mocked(refreshGoogleAccessToken).mockReset();
    await prisma.emailConnection.deleteMany({ where: { id: { in: createdConnectionIds } } });
    createdConnectionIds.length = 0;
  });

  it("throws GmailConnectionExpiredError when no refresh token was ever stored", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const connection = await prisma.emailConnection.create({
      data: {
        userId,
        provider: "gmail",
        encryptedToken: encrypt(JSON.stringify({ accessToken: "x", expiresAt: 0 })),
        status: "connected",
      },
    });
    createdConnectionIds.push(connection.id);

    await expect(getValidGmailAccessToken(connection.id)).rejects.toThrow(GmailConnectionExpiredError);
  });

  it("throws GmailConnectionExpiredError when Google reports the refresh token expired/revoked", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const connection = await prisma.emailConnection.create({
      data: {
        userId,
        provider: "gmail",
        encryptedToken: encrypt(
          JSON.stringify({ accessToken: "x", refreshToken: "stale-refresh-token", expiresAt: 0 })
        ),
        status: "connected",
      },
    });
    createdConnectionIds.push(connection.id);

    vi.mocked(refreshGoogleAccessToken).mockRejectedValueOnce(
      new GoogleTokenExpiredError("invalid_grant")
    );

    await expect(getValidGmailAccessToken(connection.id)).rejects.toThrow(GmailConnectionExpiredError);
  });

  it("propagates a non-expiry error as-is (e.g. a transient network failure)", async () => {
    const userId = (await prisma.user.findFirstOrThrow()).id;
    const connection = await prisma.emailConnection.create({
      data: {
        userId,
        provider: "gmail",
        encryptedToken: encrypt(
          JSON.stringify({ accessToken: "x", refreshToken: "some-refresh-token", expiresAt: 0 })
        ),
        status: "connected",
      },
    });
    createdConnectionIds.push(connection.id);

    vi.mocked(refreshGoogleAccessToken).mockRejectedValueOnce(new Error("network blip"));

    await expect(getValidGmailAccessToken(connection.id)).rejects.toThrow("network blip");
  });
});
