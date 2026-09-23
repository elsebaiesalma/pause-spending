import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OUTCOMES = new Set(["proceeded", "dropped", "saved_for_later"]);

// Records the user's decision on a desired item - reachable directly from
// the pause screen (Step 13, "immediately") or from the waiting-queue page
// once a wait has elapsed (Step 14, "after waiting"). "saved_for_later" is
// its own real pause_status per the design's four-value enum, landing the
// item on the wishlist; "proceeded" and "dropped" both resolve pause_status
// to "proceeded" - decision_outcome keeps the real answer for the user's
// own reflection/history - and "proceeded" is where Step 15's post-wait
// recommendations pick up.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/resolve">) {
  const { id } = await ctx.params;
  const form = await request.formData();
  const outcome = form.get("outcome")?.toString();

  if (!outcome || !OUTCOMES.has(outcome)) {
    return NextResponse.json(
      { error: "outcome must be 'proceeded', 'dropped', or 'saved_for_later'" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirstOrThrow();

  await prisma.desiredItem.update({
    where: { id, userId: user.id },
    data: {
      pauseStatus: outcome === "saved_for_later" ? "saved_for_later" : "proceeded",
      decisionOutcome: outcome,
    },
  });

  const destination =
    outcome === "saved_for_later"
      ? "/wishlist"
      : outcome === "proceeded"
        ? `/desired-items/${id}/recommendations`
        : "/";

  return NextResponse.redirect(new URL(destination, request.url));
}
