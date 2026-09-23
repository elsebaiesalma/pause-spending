import { NextResponse } from "next/server";
import { GmailConnectionExpiredError } from "@/lib/emailConnections";
import { prisma } from "@/lib/prisma";
import { syncGmailConnection } from "@/lib/sync/syncGmailConnection";

// "Sync now" - the manual trigger. Calls the exact same pipeline the
// scheduled job calls (see src/lib/sync/scheduledSync.ts) for this user's
// connected Gmail account, so there is only one sync implementation.
export async function POST() {
  const user = await prisma.user.findFirstOrThrow();

  const connection = await prisma.emailConnection.findFirst({
    where: { userId: user.id, provider: "gmail", status: "connected" },
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
    throw error;
  }
}
