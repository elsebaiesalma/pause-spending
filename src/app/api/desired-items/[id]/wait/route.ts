import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { parseReflectionFromForm, saveReflectionAnswer } from "@/lib/pauseScreen/reflection";
import { markPaused } from "@/lib/considering/consideringMeta";

const WAIT_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

// Stores the pause-screen wait choice (24h or 7d) as wait_until/pause_status
// on the desired item. This is only the "storing the choice" half of the
// wait feature per implementation Step 13 - surfacing an elapsed-wait
// queue/badge is Step 14.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/wait">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  const form = await request.formData();
  const duration = form.get("duration")?.toString();

  const waitMs = duration ? WAIT_MS[duration] : undefined;
  if (!waitMs) {
    return NextResponse.json({ error: "duration must be '24h' or '7d'" }, { status: 400 });
  }

  const pausedAt = new Date();
  try {
    await prisma.desiredItem.update({
      where: { id, userId },
      data: {
        pauseStatus: "waiting",
        waitUntil: new Date(pausedAt.getTime() + waitMs),
        // Pausing again after "Buy anyway" must not leave a stale "proceeded"
        // outcome behind on an item that is waiting again.
        decisionOutcome: null,
      },
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  // Considering tab lifecycle timestamp (see consideringMeta.ts) - saved
  // after the wait itself is already committed, so a pause always succeeds
  // regardless of whether that migration has landed yet.
  await markPaused(id, userId, pausedAt);

  // Reflection answers (see pause/page.tsx) are optional and share this
  // same form - saved after the wait itself is already committed, so a
  // pause always succeeds regardless of whether the reflection columns
  // exist yet (see reflection.ts).
  const reflection = parseReflectionFromForm(form);
  if (reflection) {
    await saveReflectionAnswer(id, userId, reflection);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
