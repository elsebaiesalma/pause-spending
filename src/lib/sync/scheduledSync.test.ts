import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./syncGmailConnection", () => ({
  syncGmailConnection: vi.fn(),
}));

import { syncGmailConnection } from "./syncGmailConnection";
import { GmailConnectionExpiredError } from "@/lib/emailConnections";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { runScheduledSyncForAllConnections } from "./scheduledSync";

const FAKE_REPORT = {
  mode: "incremental" as const,
  fetched: 0,
  inScope: 0,
  outOfScope: 0,
  needsReview: 0,
  purchasesCreated: 0,
  inScopeEmails: [],
  needsReviewEmails: [],
};

describe("runScheduledSyncForAllConnections", () => {
  const createdConnectionIds: string[] = [];
  const createdUserIds: string[] = [];

  afterEach(async () => {
    vi.mocked(syncGmailConnection).mockReset();
    await prisma.emailConnection.deleteMany({ where: { id: { in: createdConnectionIds } } });
    // Cascades to any connection created against these extra users too.
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdConnectionIds.length = 0;
    createdUserIds.length = 0;
  });

  it("syncs every connected gmail account and skips disconnected ones", async () => {
    // The unique (user_id, provider) constraint means one user can't hold
    // both a connected and a disconnected gmail row at once - a second
    // user is the realistic way to exercise both states side by side,
    // which the schema's multi-tenant-ready design supports even though
    // this app only has one real user today.
    const user = await prisma.user.findFirstOrThrow();
    const otherUser = await prisma.user.create({ data: {} });
    createdUserIds.push(otherUser.id);

    const connected = await prisma.emailConnection.create({
      data: {
        userId: user.id,
        provider: "gmail",
        encryptedToken: encrypt("{}"),
        status: "connected",
      },
    });
    const disconnected = await prisma.emailConnection.create({
      data: {
        userId: otherUser.id,
        provider: "gmail",
        encryptedToken: encrypt("{}"),
        status: "disconnected",
      },
    });
    createdConnectionIds.push(connected.id, disconnected.id);

    vi.mocked(syncGmailConnection).mockResolvedValue(FAKE_REPORT);

    const results = await runScheduledSyncForAllConnections();

    const syncedIds = results.map((r) => r.connectionId);
    expect(syncedIds).toContain(connected.id);
    expect(syncedIds).not.toContain(disconnected.id);
    expect(syncGmailConnection).toHaveBeenCalledWith(connected.id);
    expect(syncGmailConnection).not.toHaveBeenCalledWith(disconnected.id);
  });

  it("calls the exact same sync function the manual 'sync now' route calls - no separate implementation", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const connected = await prisma.emailConnection.create({
      data: {
        userId: user.id,
        provider: "gmail",
        encryptedToken: encrypt("{}"),
        status: "connected",
      },
    });
    createdConnectionIds.push(connected.id);

    vi.mocked(syncGmailConnection).mockResolvedValue(FAKE_REPORT);

    await runScheduledSyncForAllConnections();

    // syncGmailConnection is imported from the same module the "sync now"
    // route imports it from (src/lib/sync/syncGmailConnection.ts) - this
    // mock IS that shared function, so calling it here is calling the
    // identical pipeline the manual route triggers.
    expect(syncGmailConnection).toHaveBeenCalledTimes(1);
  });

  it("skips a connection whose token expired without aborting the batch for the rest", async () => {
    const user = await prisma.user.findFirstOrThrow();
    const otherUser = await prisma.user.create({ data: {} });
    createdUserIds.push(otherUser.id);

    const expiring = await prisma.emailConnection.create({
      data: { userId: user.id, provider: "gmail", encryptedToken: encrypt("{}"), status: "connected" },
    });
    const healthy = await prisma.emailConnection.create({
      data: { userId: otherUser.id, provider: "gmail", encryptedToken: encrypt("{}"), status: "connected" },
    });
    createdConnectionIds.push(expiring.id, healthy.id);

    vi.mocked(syncGmailConnection).mockImplementation(async (connectionId: string) => {
      if (connectionId === expiring.id) {
        throw new GmailConnectionExpiredError(connectionId);
      }
      return FAKE_REPORT;
    });

    const results = await runScheduledSyncForAllConnections();

    expect(results.map((r) => r.connectionId)).toEqual([healthy.id]);
  });
});
