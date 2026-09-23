import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discardReviewPurchase } from "@/lib/reviewQueue";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/purchases/[id]/discard">) {
  const { id } = await ctx.params;
  const user = await prisma.user.findFirstOrThrow();

  await discardReviewPurchase(id, user.id);

  return NextResponse.redirect(new URL("/purchases", request.url));
}
