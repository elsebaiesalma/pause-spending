import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/emailConnections", async () => {
  const actual = await vi.importActual<typeof import("@/lib/emailConnections")>(
    "@/lib/emailConnections"
  );
  return { ...actual, getValidGmailAccessToken: vi.fn() };
});

vi.mock("@/lib/gmail/fetchMessages", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gmail/fetchMessages")>(
    "@/lib/gmail/fetchMessages"
  );
  return {
    ...actual,
    fetchRecentMessages: vi.fn(),
    getCurrentHistoryId: vi.fn(),
    getMessageSummaries: vi.fn(),
    listNewMessageIdsSinceHistory: vi.fn(),
  };
});

vi.mock("@/lib/emailClassification/classifyEmail", () => ({
  classifyEmail: vi.fn(),
}));

vi.mock("@/lib/emailExtraction/extractReceipt", () => ({
  extractAndPersistPurchase: vi.fn(),
}));

import { GmailConnectionExpiredError, getValidGmailAccessToken } from "@/lib/emailConnections";
import {
  fetchRecentMessages,
  getCurrentHistoryId,
  getMessageSummaries,
  listNewMessageIdsSinceHistory,
  HistoryTooOldError,
} from "@/lib/gmail/fetchMessages";
import { classifyEmail } from "@/lib/emailClassification/classifyEmail";
import { extractAndPersistPurchase } from "@/lib/emailExtraction/extractReceipt";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { syncGmailConnection } from "./syncGmailConnection";

const FIXTURE_MESSAGE = {
  id: "msg-1",
  from: "orders@nike.com",
  subject: "Your Nike Order Confirmation",
  snippet: "",
  internalDate: "0",
};

describe("syncGmailConnection", () => {
  let connectionId: string;

  beforeEach(async () => {
    const user = await prisma.user.findFirstOrThrow();
    const connection = await prisma.emailConnection.create({
      data: {
        userId: user.id,
        provider: "gmail-test-sync",
        encryptedToken: encrypt("{}"),
        status: "connected",
        syncCursor: null,
      },
    });
    connectionId = connection.id;
  });

  afterEach(async () => {
    vi.mocked(getValidGmailAccessToken).mockReset();
    vi.mocked(fetchRecentMessages).mockReset();
    vi.mocked(getCurrentHistoryId).mockReset();
    vi.mocked(getMessageSummaries).mockReset();
    vi.mocked(listNewMessageIdsSinceHistory).mockReset();
    vi.mocked(classifyEmail).mockReset();
    vi.mocked(extractAndPersistPurchase).mockReset();
    await prisma.emailConnection.deleteMany({ where: { id: connectionId } });
  });

  it("runs a backfill (date-based fetch) when there is no stored cursor, and stores the new cursor", async () => {
    vi.mocked(getValidGmailAccessToken).mockResolvedValue("fake-token");
    vi.mocked(fetchRecentMessages).mockResolvedValueOnce([FIXTURE_MESSAGE]);
    vi.mocked(classifyEmail).mockResolvedValueOnce("in_scope");
    vi.mocked(extractAndPersistPurchase).mockResolvedValueOnce(undefined);
    vi.mocked(getCurrentHistoryId).mockResolvedValueOnce("100");

    const report = await syncGmailConnection(connectionId);

    expect(report.mode).toBe("backfill");
    expect(fetchRecentMessages).toHaveBeenCalledTimes(1);
    expect(listNewMessageIdsSinceHistory).not.toHaveBeenCalled();
    expect(report.fetched).toBe(1);
    expect(report.inScope).toBe(1);

    const updated = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });
    expect(updated.syncCursor).toBe("100");
  });

  it("runs an incremental fetch (history-based) when a cursor is already stored, never re-scanning the full window", async () => {
    await prisma.emailConnection.update({
      where: { id: connectionId },
      data: { syncCursor: "50" },
    });

    vi.mocked(getValidGmailAccessToken).mockResolvedValue("fake-token");
    vi.mocked(listNewMessageIdsSinceHistory).mockResolvedValueOnce(["msg-new"]);
    vi.mocked(getMessageSummaries).mockResolvedValueOnce([
      { ...FIXTURE_MESSAGE, id: "msg-new" },
    ]);
    vi.mocked(classifyEmail).mockResolvedValueOnce("in_scope");
    vi.mocked(extractAndPersistPurchase).mockResolvedValueOnce(undefined);
    vi.mocked(getCurrentHistoryId).mockResolvedValueOnce("200");

    const report = await syncGmailConnection(connectionId);

    expect(report.mode).toBe("incremental");
    expect(listNewMessageIdsSinceHistory).toHaveBeenCalledWith("fake-token", "50");
    expect(fetchRecentMessages).not.toHaveBeenCalled();
    expect(report.fetched).toBe(1);

    const updated = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });
    expect(updated.syncCursor).toBe("200");
  });

  it("falls back to a full backfill if the stored cursor is older than Gmail's retention window", async () => {
    await prisma.emailConnection.update({
      where: { id: connectionId },
      data: { syncCursor: "1" },
    });

    vi.mocked(getValidGmailAccessToken).mockResolvedValue("fake-token");
    vi.mocked(listNewMessageIdsSinceHistory).mockRejectedValueOnce(
      new HistoryTooOldError("too old")
    );
    vi.mocked(fetchRecentMessages).mockResolvedValueOnce([FIXTURE_MESSAGE]);
    vi.mocked(classifyEmail).mockResolvedValueOnce("out_of_scope");
    vi.mocked(getCurrentHistoryId).mockResolvedValueOnce("300");

    const report = await syncGmailConnection(connectionId);

    expect(report.mode).toBe("backfill");
    expect(fetchRecentMessages).toHaveBeenCalledTimes(1);
    expect(extractAndPersistPurchase).not.toHaveBeenCalled();
  });

  it("only extracts messages classified in_scope, never out_of_scope or needs_review ones", async () => {
    const messages = [
      { ...FIXTURE_MESSAGE, id: "a" },
      { ...FIXTURE_MESSAGE, id: "b" },
      { ...FIXTURE_MESSAGE, id: "c" },
    ];
    vi.mocked(getValidGmailAccessToken).mockResolvedValue("fake-token");
    vi.mocked(fetchRecentMessages).mockResolvedValueOnce(messages);
    vi.mocked(classifyEmail).mockImplementation(async (m) => {
      if (m.id === "a") return "in_scope";
      if (m.id === "b") return "out_of_scope";
      return "needs_review";
    });
    vi.mocked(extractAndPersistPurchase).mockResolvedValue(undefined);
    vi.mocked(getCurrentHistoryId).mockResolvedValueOnce("400");

    await syncGmailConnection(connectionId);

    expect(extractAndPersistPurchase).toHaveBeenCalledTimes(1);
    expect(extractAndPersistPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.objectContaining({ id: "a" }) })
    );
  });

  it("marks the connection expired and stops sync, rather than failing silently, when the token can't be refreshed", async () => {
    vi.mocked(getValidGmailAccessToken).mockRejectedValueOnce(
      new GmailConnectionExpiredError(connectionId)
    );

    await expect(syncGmailConnection(connectionId)).rejects.toThrow(GmailConnectionExpiredError);

    const updated = await prisma.emailConnection.findUniqueOrThrow({ where: { id: connectionId } });
    expect(updated.status).toBe("expired");
    expect(fetchRecentMessages).not.toHaveBeenCalled();
  });
});
