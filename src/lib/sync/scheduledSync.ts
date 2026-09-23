import { prisma } from "@/lib/prisma";
import { syncGmailConnection, type SyncReport } from "./syncGmailConnection";

export type ScheduledSyncResult = {
  connectionId: string;
  report: SyncReport;
};

// The function an external scheduler triggers periodically. Only ever
// processes connections with status "connected" - a disconnected
// connection's token has been revoked and must not be synced.
export async function runScheduledSyncForAllConnections(): Promise<ScheduledSyncResult[]> {
  const connections = await prisma.emailConnection.findMany({
    where: { provider: "gmail", status: "connected" },
  });

  const results: ScheduledSyncResult[] = [];
  for (const connection of connections) {
    const report = await syncGmailConnection(connection.id);
    results.push({ connectionId: connection.id, report });
  }

  return results;
}
