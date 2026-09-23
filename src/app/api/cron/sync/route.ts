import { NextRequest, NextResponse } from "next/server";
import { runScheduledSyncForAllConnections } from "@/lib/sync/scheduledSync";

// The endpoint an external scheduler (Vercel Cron, GitHub Actions cron,
// cron-job.org, etc.) hits periodically once this app is deployed with a
// public URL. Protected by a shared secret rather than tied to any one
// scheduling platform - Postgres itself can't make this call (Neon has no
// pg_net), so the trigger has to come from outside the database.
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new Error("CRON_SECRET is not set");
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await runScheduledSyncForAllConnections();
  return NextResponse.json({
    connectionsSynced: results.length,
    results,
  });
}
