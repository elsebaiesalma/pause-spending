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

  // The form is pre-filled with the review-queue placeholder's defaults
  // (price "0", category "unknown") so the fields are never empty even
  // when nothing has actually been corrected yet. Requiring a genuine
  // positive price and a real category - not just "non-empty" - stops a
  // click on Confirm with no edits from silently promoting the untouched
  // placeholder into a real, active purchase.
  if (
    !itemName ||
    !category ||
    category.toLowerCase() === "unknown" ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return NextResponse.json(
      { error: "itemName, a real category, and a price greater than 0 are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirstOrThrow();
  await confirmReviewPurchase(id, user.id, { itemName, category, price });

  return NextResponse.redirect(new URL("/purchases", request.url));
}
