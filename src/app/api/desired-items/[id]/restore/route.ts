import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { markSaved } from "@/lib/considering/consideringMeta";

// The let-go list's "Restore" action - moves an item back to "saved for
// later", exactly reversing decisionOutcome/pauseStatus. markSaved also
// resets the considering-lifecycle let-go marking (letGoAutomatically/
// letGoAt), since a restored item is no longer let go at all, and restarts
// its 60-day retention clock (savedAt) - restoring is treated the same as
// a fresh save, not a resumption of the old one.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/restore">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;

  try {
    await prisma.desiredItem.update({
      where: { id, userId },
      data: { pauseStatus: "saved_for_later", decisionOutcome: null },
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  await markSaved(id, userId, new Date());

  return NextResponse.redirect(new URL("/considering/let-go", request.url));
}
