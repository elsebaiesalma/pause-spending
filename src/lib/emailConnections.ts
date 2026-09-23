import { decrypt, encrypt, type EncryptedEnvelope } from "@/lib/encryption";
import {
  refreshGoogleAccessToken,
  revokeGoogleToken,
  type StoredGoogleToken,
} from "@/lib/oauth/google";
import { prisma } from "@/lib/prisma";

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
    throw new Error("Access token expired and no refresh token is stored");
  }

  const refreshed = await refreshGoogleAccessToken(stored.refreshToken);

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
