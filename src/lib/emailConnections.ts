import { decrypt, encrypt, type EncryptedEnvelope } from "@/lib/encryption";
import {
  GoogleTokenExpiredError,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  type StoredGoogleToken,
} from "@/lib/oauth/google";
import { prisma } from "@/lib/prisma";

// Thrown when a Gmail connection's token can no longer be refreshed - no
// refresh token was ever stored, or Google reports it expired/revoked
// (including the accepted 7-day testing-mode expiry). Callers use this to
// mark the connection `expired` and stop syncing it rather than failing
// silently or retrying indefinitely.
export class GmailConnectionExpiredError extends Error {
  constructor(public readonly connectionId: string) {
    super(`Gmail connection ${connectionId} has expired and needs reconnection`);
    this.name = "GmailConnectionExpiredError";
  }
}

export async function revokeConnectionToken(
  provider: string,
  encryptedToken: unknown
): Promise<void> {
  if (provider !== "gmail") {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const stored = JSON.parse(decrypt(encryptedToken as EncryptedEnvelope)) as StoredGoogleToken;
  const tokenToRevoke = stored.refreshToken ?? stored.accessToken;
  await revokeGoogleToken(tokenToRevoke);
}

const EXPIRY_BUFFER_MS = 60_000;

// Returns a valid Gmail access token for this connection, refreshing and
// re-persisting it first if the stored one has expired (or is about to).
export async function getValidGmailAccessToken(connectionId: string): Promise<string> {
  const connection = await prisma.emailConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  const stored = JSON.parse(
    decrypt(connection.encryptedToken as unknown as EncryptedEnvelope)
  ) as StoredGoogleToken;

  if (stored.expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
    return stored.accessToken;
  }

  if (!stored.refreshToken) {
    throw new GmailConnectionExpiredError(connectionId);
  }

  let refreshed;
  try {
    refreshed = await refreshGoogleAccessToken(stored.refreshToken);
  } catch (error) {
    if (error instanceof GoogleTokenExpiredError) {
      throw new GmailConnectionExpiredError(connectionId);
    }
    throw error;
  }

  const updated: StoredGoogleToken = {
    accessToken: refreshed.access_token,
    refreshToken: stored.refreshToken,
    expiresAt: Date.now() + refreshed.expires_in * 1000,
  };

  await prisma.emailConnection.update({
    where: { id: connectionId },
    data: { encryptedToken: encrypt(JSON.stringify(updated)) },
  });

  return updated.accessToken;
}
