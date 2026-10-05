import { NextRequest, NextResponse } from "next/server";
import { confirmReviewPurchase } from "@/lib/reviewQueue";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/purchases/[id]/confirm">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

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

  try {
    await confirmReviewPurchase(id, userId, { itemName, category, price });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/purchases", request.url));
}
