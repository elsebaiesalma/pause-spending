import { decrypt, type EncryptedEnvelope } from "@/lib/encryption";
import { revokeGoogleToken, type StoredGoogleToken } from "@/lib/oauth/google";

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
