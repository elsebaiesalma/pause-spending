import { GmailConnectionExpiredError } from "@/lib/emailConnections";
import { prisma } from "@/lib/prisma";
import { syncGmailConnection, type SyncReport } from "./syncGmailConnection";

export type ScheduledSyncResult = {
  connectionId: string;
  report: SyncReport | null;
  error?: string;
};

// The function an external scheduler triggers periodically. Only ever
// processes connections with status "connected" - a disconnected
// connection's token has been revoked and must not be synced. Every
// external call inside syncGmailConnection already retries transient
// failures with backoff (see src/lib/retry.ts); if a connection still fails
// after that - a token expiry, or any other error surviving retries - that
// must not abort the batch for every other connection, so it's caught and
// recorded as a degraded result here instead of thrown.
export async function runScheduledSyncForAllConnections(): Promise<ScheduledSyncResult[]> {
  const connections = await prisma.emailConnection.findMany({
    where: { provider: "gmail", status: "connected" },
  });

  const results: ScheduledSyncResult[] = [];
  for (const connection of connections) {
    try {
      const report = await syncGmailConnection(connection.id);
      results.push({ connectionId: connection.id, report });
    } catch (error) {
      const message =
        error instanceof GmailConnectionExpiredError
          ? "token_expired"
          : error instanceof Error
            ? error.message
            : "unknown_error";
      results.push({ connectionId: connection.id, report: null, error: message });
    }
  }

  return results;
}
