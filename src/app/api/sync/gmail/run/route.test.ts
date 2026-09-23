import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sync/syncGmailConnection", () => ({
  syncGmailConnection: vi.fn(),
}));

import { syncGmailConnection } from "@/lib/sync/syncGmailConnection";
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
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.emailConnection.deleteMany({ where: { userId: user.id, provider: "gmail" } });
    }
  });

  it("returns 404 and never syncs when there is no connected gmail account", async () => {
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
    vi.mocked(syncGmailConnection).mockRejectedValueOnce(new GmailConnectionExpiredError(connection.id));

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "token_expired" });
  });
});
