import { NextResponse } from "next/server";
import { GmailConnectionExpiredError } from "@/lib/emailConnections";
import { prisma } from "@/lib/prisma";
import { syncGmailConnection, GmailSyncPausedError } from "@/lib/sync/syncGmailConnection";
import { requireUserId } from "@/lib/session";

// "Sync now" - the manual trigger. Calls the exact same pipeline the
// scheduled job calls (see src/lib/sync/scheduledSync.ts) for this user's
// connected Gmail account, so there is only one sync implementation.
export async function POST() {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const connection = await prisma.emailConnection.findFirst({
    where: { userId, provider: "gmail", status: "connected" },
  });

  if (!connection) {
    return NextResponse.json({ error: "no_connected_gmail_account" }, { status: 404 });
  }

  try {
    const report = await syncGmailConnection(connection.id);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof GmailConnectionExpiredError) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }
    if (error instanceof GmailSyncPausedError) {
      return NextResponse.json({ error: "sync_paused" }, { status: 503 });
    }
    // Every external call syncGmailConnection makes already retries
    // transient failures with backoff (src/lib/retry.ts). If it still
    // failed after that, surface a clean degraded response - the user can
    // just try "sync now" again - rather than an unhandled 500.
    console.error("Gmail sync failed:", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: "sync_failed", message }, { status: 502 });
  }
}
