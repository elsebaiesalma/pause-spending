import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { markSaved } from "@/lib/considering/consideringMeta";
import { isStoreVisitAnswer, parseBoughtPrice, setStoreVisitAnswer } from "@/lib/stillWantIt/storeVisit";

// Answers the "Did you buy it?" prompt that follows a store visit.
//   bought      -> purchased: pauseStatus and decisionOutcome "proceeded",
//                  price set from the form. "proceeded" is excluded from the
//                  Kept total by the existing dropped-only filter.
//   not_bought  -> back to Considering as a saved item.
//   not_sure    -> nothing changes; the prompt just stops asking.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/store-visit-answer">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const form = await request.formData();
  const answer = form.get("answer")?.toString();
  if (!isStoreVisitAnswer(answer)) {
    return NextResponse.json({ error: "answer must be 'bought', 'not_bought', or 'not_sure'" }, { status: 400 });
  }

  const now = new Date();
  let price: number | null = null;
  if (answer === "bought") {
    price = parseBoughtPrice(form.get("price"));
    if (price === null) {
      return NextResponse.json({ error: "a price greater than 0 is required" }, { status: 400 });
    }
  }

  try {
    if (answer === "bought") {
      await prisma.desiredItem.update({
        where: { id, userId },
        data: { price, pauseStatus: "proceeded", decisionOutcome: "proceeded" },
      });
    } else if (answer === "not_bought") {
      await prisma.desiredItem.update({
        where: { id, userId },
        data: { pauseStatus: "saved_for_later", decisionOutcome: null },
      });
    }
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  if (answer === "not_bought") {
    await markSaved(id, userId, now);
  }

  await setStoreVisitAnswer(id, userId, answer);

  const destination = answer === "not_sure" ? `/desired-items/${id}/still-want-it` : "/considering";
  return NextResponse.redirect(new URL(destination, request.url));
}
