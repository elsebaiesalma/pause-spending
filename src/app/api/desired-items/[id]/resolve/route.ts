import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OUTCOMES = new Set(["proceeded", "dropped"]);

// Records the user's decision once an elapsed wait item is prompted on
// (the waiting-queue page): "proceeded" (they still want it - Step 15
// builds the actual post-wait recommendations on top of this) or
// "dropped" (they no longer want it). pause_status only has the four
// values the design defines, so both outcomes move it to "proceeded" -
// meaning "the pause flow has concluded" - and the real outcome is kept
// in decision_outcome, per the design's note that the field exists for
// the user's own reflection/history.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/resolve">) {
  const { id } = await ctx.params;
  const form = await request.formData();
  const outcome = form.get("outcome")?.toString();

  if (!outcome || !OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: "outcome must be 'proceeded' or 'dropped'" }, { status: 400 });
  }

  const user = await prisma.user.findFirstOrThrow();

  await prisma.desiredItem.update({
    where: { id, userId: user.id },
    data: { pauseStatus: "proceeded", decisionOutcome: outcome },
  });

  return NextResponse.redirect(new URL("/waiting", request.url));
}
