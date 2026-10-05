import { NextRequest, NextResponse } from "next/server";
import { discardReviewPurchase } from "@/lib/reviewQueue";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/purchases/[id]/discard">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;

  try {
    await discardReviewPurchase(id, userId);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/purchases", request.url));
}
