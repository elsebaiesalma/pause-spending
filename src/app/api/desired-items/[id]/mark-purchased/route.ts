import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

// The let-go list's "I bought this after all" action. Deliberately a
// separate endpoint from /resolve rather than reusing its outcome:
// "proceeded" - that endpoint always redirects "proceeded" to the
// recommendations ("still deciding") page, which makes no sense once the
// item has already been bought; this one redirects back to the let-go list
// instead. decisionOutcome "proceeded" is the same value /resolve already
// uses for that outcome, so src/lib/dashboard/kept.ts's "dropped"-only
// filter already excludes this item with no further change.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/mark-purchased">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;

  try {
    await prisma.desiredItem.update({
      where: { id, userId },
      data: { pauseStatus: "proceeded", decisionOutcome: "proceeded" },
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/considering/let-go", request.url));
}
