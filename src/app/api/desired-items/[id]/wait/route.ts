import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WAIT_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

// Stores the pause-screen wait choice (24h or 7d) as wait_until/pause_status
// on the desired item. This is only the "storing the choice" half of the
// wait feature per implementation Step 13 - surfacing an elapsed-wait
// queue/badge is Step 14.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/wait">) {
  const { id } = await ctx.params;
  const form = await request.formData();
  const duration = form.get("duration")?.toString();

  const waitMs = duration ? WAIT_MS[duration] : undefined;
  if (!waitMs) {
    return NextResponse.json({ error: "duration must be '24h' or '7d'" }, { status: 400 });
  }

  const user = await prisma.user.findFirstOrThrow();

  await prisma.desiredItem.update({
    where: { id, userId: user.id },
    data: {
      pauseStatus: "waiting",
      waitUntil: new Date(Date.now() + waitMs),
    },
  });

  return NextResponse.redirect(new URL("/", request.url));
}
