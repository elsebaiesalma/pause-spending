import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmReviewPurchase } from "@/lib/reviewQueue";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/purchases/[id]/confirm">) {
  const { id } = await ctx.params;
  const form = await request.formData();

  const itemName = form.get("itemName")?.toString().trim();
  const category = form.get("category")?.toString().trim();
  const priceRaw = form.get("price")?.toString();
  const price = priceRaw ? Number(priceRaw) : NaN;

  if (!itemName || !category || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "itemName, category, and a non-negative price are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirstOrThrow();
  await confirmReviewPurchase(id, user.id, { itemName, category, price });

  return NextResponse.redirect(new URL("/purchases", request.url));
}
