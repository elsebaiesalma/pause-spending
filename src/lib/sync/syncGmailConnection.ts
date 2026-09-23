import { prisma } from "@/lib/prisma";
import { GmailConnectionExpiredError, getValidGmailAccessToken } from "@/lib/emailConnections";
import {
  fetchRecentMessages,
  getCurrentHistoryId,
  getMessageSummaries,
  listNewMessageIdsSinceHistory,
  HistoryTooOldError,
  type GmailMessageSummary,
} from "@/lib/gmail/fetchMessages";
import { classifyEmail } from "@/lib/emailClassification/classifyEmail";
import { extractAndPersistPurchase } from "@/lib/emailExtraction/extractReceipt";
import { mapWithConcurrency } from "@/lib/concurrency";

const BACKFILL_WINDOW_MONTHS = 6;
const CLASSIFICATION_CONCURRENCY = 5;
const EXTRACTION_CONCURRENCY = 5;

export type SyncMode = "backfill" | "incremental";

export type SyncReport = {
  mode: SyncMode;
  fetched: number;
  inScope: number;
  outOfScope: number;
  needsReview: number;
  purchasesCreated: number;
  inScopeEmails: { id: string; from: string; subject: string }[];
  needsReviewEmails: { id: string; from: string; subject: string }[];
};

function summarize(message: GmailMessageSummary) {
  return { id: message.id, from: message.from, subject: message.subject };
}

async function fetchMessagesForSync(
  accessToken: string,
  storedCursor: string | null
): Promise<{ mode: SyncMode; messages: GmailMessageSummary[] }> {
  if (!storedCursor) {
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - BACKFILL_WINDOW_MONTHS);
    return { mode: "backfill", messages: await fetchRecentMessages(accessToken, sinceDate) };
  }

  try {
    const newIds = await listNewMessageIdsSinceHistory(accessToken, storedCursor);
    const messages = await getMessageSummaries(accessToken, newIds);
    return { mode: "incremental", messages };
  } catch (error) {
    if (!(error instanceof HistoryTooOldError)) {
      throw error;
    }
    // The stored cursor is older than Gmail's retention window - fall back
    // to a full backfill rather than failing the sync.
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - BACKFILL_WINDOW_MONTHS);
    return { mode: "backfill", messages: await fetchRecentMessages(accessToken, sinceDate) };
  }
}

// The single sync pipeline (fetch -> classify -> extract -> seed wardrobe)
// used by both the manual "sync now" button and the scheduled job, so
// there is exactly one implementation of "how a sync works" - never two
// diverging copies. Uses the stored history cursor for an incremental
// fetch when one exists; otherwise runs the initial 6-month backfill. The
// cursor is always refreshed at the end, whichever path ran.
export async function syncGmailConnection(connectionId: string): Promise<SyncReport> {
  const connection = await prisma.emailConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  let accessToken: string;
  try {
    accessToken = await getValidGmailAccessToken(connectionId);
  } catch (error) {
    if (error instanceof GmailConnectionExpiredError) {
      await prisma.emailConnection.update({ where: { id: connectionId }, data: { status: "expired" } });
    }
    throw error;
  }
  const { mode, messages } = await fetchMessagesForSync(accessToken, connection.syncCursor);

  const classifications = await mapWithConcurrency(
    messages,
    CLASSIFICATION_CONCURRENCY,
    async (message) => ({
      message,
      result: await classifyEmail(message),
    })
  );

  const inScope: GmailMessageSummary[] = [];
  const outOfScope: GmailMessageSummary[] = [];
  const needsReview: GmailMessageSummary[] = [];

  for (const { message, result } of classifications) {
    if (result === "in_scope") inScope.push(message);
    else if (result === "out_of_scope") outOfScope.push(message);
    else needsReview.push(message);
  }

  await mapWithConcurrency(inScope, EXTRACTION_CONCURRENCY, (message) =>
    extractAndPersistPurchase({
      accessToken,
      userId: connection.userId,
      connectionId: connection.id,
      message,
    })
  );

  const purchasesCreated = await prisma.purchase.count({
    where: { userId: connection.userId, sourceEmailId: { in: inScope.map((m) => m.id) } },
  });

  const newHistoryId = await getCurrentHistoryId(accessToken);
  await prisma.emailConnection.update({
    where: { id: connectionId },
    data: { syncCursor: newHistoryId },
  });

  return {
    mode,
    fetched: messages.length,
    inScope: inScope.length,
    outOfScope: outOfScope.length,
    needsReview: needsReview.length,
    purchasesCreated,
    inScopeEmails: inScope.map(summarize),
    needsReviewEmails: needsReview.map(summarize),
  };
}
