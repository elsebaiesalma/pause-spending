import { NextRequest, NextResponse } from "next/server";
import { currentMonthKey, removeBudgetForMonth, setBudgetForMonth } from "@/lib/budget";
import { safeReturnPath } from "@/lib/looks/returnPath";
import { requireUserId } from "@/lib/session";

// intent=off turns the plan off for this month; anything else sets the amount.
// returnTo (same-site paths only) lets Home and Settings both use this form.
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const form = await request.formData();
  const rawReturn = form.get("returnTo")?.toString();
  const returnTo = rawReturn ? safeReturnPath(rawReturn) : "/budget";

  if (form.get("intent")?.toString() === "off") {
    await removeBudgetForMonth(userId, currentMonthKey());
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const amountRaw = form.get("amount")?.toString();
  const amount = amountRaw ? Number(amountRaw) : NaN;

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
  }

  await setBudgetForMonth(userId, currentMonthKey(), amount);

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
