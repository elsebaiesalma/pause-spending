import { fetchWithRetry } from "@/lib/retry";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export type StoredGoogleToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function buildGoogleAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
    response_type: "code",
    scope: GMAIL_READONLY_SCOPE,
    access_type: "offline",
    prompt: "consent select_account",
    state,
  });

  return `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const response = await fetchWithRetry(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export type RefreshedGoogleToken = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

// Thrown specifically when Google reports the refresh token itself is
// expired or revoked (`invalid_grant`) - distinct from a transient/network
// failure, since only this case means the connection genuinely needs the
// user to reconnect (including the accepted 7-day testing-mode expiry).
export class GoogleTokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleTokenExpiredError";
  }
}

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<RefreshedGoogleToken> {
  const response = await fetchWithRetry(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 400 && body.includes("invalid_grant")) {
      throw new GoogleTokenExpiredError(`Google refresh token is expired or revoked: ${body}`);
    }
    throw new Error(`Google token refresh failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<RefreshedGoogleToken>;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  const response = await fetchWithRetry(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token revocation failed (${response.status}): ${body}`);
  }
}
