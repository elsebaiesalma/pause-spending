import { GmailConnectionExpiredError } from "@/lib/emailConnections";
import { prisma } from "@/lib/prisma";
import { syncGmailConnection, type SyncReport } from "./syncGmailConnection";

export type ScheduledSyncResult = {
  connectionId: string;
  report: SyncReport;
};

// The function an external scheduler triggers periodically. Only ever
// processes connections with status "connected" - a disconnected
// connection's token has been revoked and must not be synced. One
// connection's token having expired (syncGmailConnection already marks it
// `expired` before rethrowing) must not abort the batch for every other
// connection, so that failure is caught and skipped here; any other error
// still propagates, since it isn't a known, gracefully-handled failure mode.
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
      if (!(error instanceof GmailConnectionExpiredError)) {
        throw error;
      }
    }
  }

  return results;
}
