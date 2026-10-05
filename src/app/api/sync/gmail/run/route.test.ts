import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sync/syncGmailConnection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sync/syncGmailConnection")>();
  return {
    ...actual,
    syncGmailConnection: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { syncGmailConnection, GmailSyncPausedError } from "@/lib/sync/syncGmailConnection";
import { auth } from "@/lib/auth";
import { GmailConnectionExpiredError } from "@/lib/emailConnections";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const FAKE_REPORT = {
  mode: "incremental" as const,
  fetched: 2,
  inScope: 1,
  outOfScope: 1,
  needsReview: 0,
  purchasesCreated: 1,
  inScopeEmails: [],
  needsReviewEmails: [],
};

describe("POST /api/sync/gmail/run", () => {
  afterEach(async () => {
    vi.mocked(syncGmailConnection).mockReset();
    vi.mocked(auth).mockReset();
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.emailConnection.deleteMany({ where: { userId: user.id, provider: "gmail" } });
    }
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(syncGmailConnection).not.toHaveBeenCalled();
  });

  it("returns 404 and never syncs when there is no connected gmail account", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST();

    expect(response.status).toBe(404);
    expect(syncGmailConnection).not.toHaveBeenCalled();
  });

  it("calls syncGmailConnection for the connected account and returns its report", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const connection = await prisma.emailConnection.create({
      data: {
        userId: user.id,
        provider: "gmail",
        encryptedToken: encrypt("{}"),
        status: "connected",
      },
    });
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(syncGmailConnection).mockResolvedValueOnce(FAKE_REPORT);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(syncGmailConnection).toHaveBeenCalledWith(connection.id);
    expect(body).toEqual(FAKE_REPORT);
  });

  it("returns a clear token_expired response instead of a raw 500 when reconnection is needed", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const connection = await prisma.emailConnection.create({
      data: { userId: user.id, provider: "gmail", encryptedToken: encrypt("{}"), status: "connected" },
    });
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(syncGmailConnection).mockRejectedValueOnce(new GmailConnectionExpiredError(connection.id));

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "token_expired" });
  });

  it("returns a clean degraded response instead of an unhandled 500 when sync fails for any other reason", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await prisma.emailConnection.create({
      data: { userId: user.id, provider: "gmail", encryptedToken: encrypt("{}"), status: "connected" },
    });
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(syncGmailConnection).mockRejectedValueOnce(
      new Error("Gmail API request failed (503): backend unavailable")
    );

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: "sync_failed",
      message: "Gmail API request failed (503): backend unavailable",
    });
  });

  it("returns a clear sync_paused response instead of a raw 500 when GMAIL_SYNC_PAUSED is set", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await prisma.emailConnection.create({
      data: { userId: user.id, provider: "gmail", encryptedToken: encrypt("{}"), status: "connected" },
    });
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    vi.mocked(syncGmailConnection).mockRejectedValueOnce(new GmailSyncPausedError());

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "sync_paused" });
  });
});
