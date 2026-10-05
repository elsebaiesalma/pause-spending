import crypto from "node:crypto";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is not set");
  }
  return value;
}

// A synchronizer CSRF token derived from (secret, userId) rather than a
// separate random value in its own cookie: it needs no storage, and an
// attacker can neither compute it (doesn't know AUTH_SECRET) nor read it
// off the real page cross-origin (blocked by the browser's same-origin
// policy) to embed in a forged cross-site form post. Used only for the two
// destructive Gmail-connection routes (disconnect/delete), on top of - not
// instead of - requiring a real session for those routes.
export function csrfTokenForUser(userId: string): string {
  return crypto.createHmac("sha256", secret()).update(userId).digest("hex");
}

export function verifyCsrfToken(userId: string, submitted: FormDataEntryValue | null): boolean {
  if (typeof submitted !== "string" || submitted.length === 0) {
    return false;
  }
  const expected = Buffer.from(csrfTokenForUser(userId));
  const actual = Buffer.from(submitted);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
