import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { parseReflectionFromForm, saveReflectionAnswer } from "@/lib/pauseScreen/reflection";
import { markSaved, markLetGo } from "@/lib/considering/consideringMeta";

const OUTCOMES = new Set(["proceeded", "dropped", "saved_for_later"]);

// Records the user's decision on a desired item - reachable directly from
// the pause screen (Step 13, "immediately") or from the waiting-queue page
// once a wait has elapsed (Step 14, "after waiting"). "saved_for_later" is
// its own real pause_status per the design's four-value enum, landing the
// item on the wishlist; "proceeded" and "dropped" both resolve pause_status
// to "proceeded" - decision_outcome keeps the real answer for the user's
// own reflection/history - and "proceeded" is where Still want it picks up.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/resolve">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  const form = await request.formData();
  const outcome = form.get("outcome")?.toString();

  if (!outcome || !OUTCOMES.has(outcome)) {
    return NextResponse.json(
      { error: "outcome must be 'proceeded', 'dropped', or 'saved_for_later'" },
      { status: 400 }
    );
  }

  const now = new Date();
  try {
    await prisma.desiredItem.update({
      where: { id, userId },
      data: {
        pauseStatus: outcome === "saved_for_later" ? "saved_for_later" : "proceeded",
        decisionOutcome: outcome,
      },
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  // Considering tab lifecycle timestamps (see consideringMeta.ts) - saved
  // after the outcome itself is already committed, so every outcome always
  // succeeds regardless of whether that migration has landed yet.
  if (outcome === "saved_for_later") {
    await markSaved(id, userId, now);
  } else if (outcome === "dropped") {
    await markLetGo(id, userId, false, now);
  }

  // Reflection answers (see pause/page.tsx) are optional and share this
  // same form - saved after the outcome itself is already committed, so
  // Let it go / Buy anyway always succeed regardless of whether the
  // reflection columns exist yet (see reflection.ts).
  const reflection = parseReflectionFromForm(form);
  if (reflection) {
    await saveReflectionAnswer(id, userId, reflection);
  }

  const destination =
    outcome === "saved_for_later"
      ? "/considering"
      : outcome === "proceeded"
        ? `/desired-items/${id}/still-want-it`
        : "/considering";

  return NextResponse.redirect(new URL(destination, request.url));
}
