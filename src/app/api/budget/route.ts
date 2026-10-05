import { NextRequest, NextResponse } from "next/server";
import { currentMonthKey, setBudgetForMonth } from "@/lib/budget";
import { requireUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const form = await request.formData();
  const amountRaw = form.get("amount")?.toString();
  const amount = amountRaw ? Number(amountRaw) : NaN;

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
  }

  await setBudgetForMonth(userId, currentMonthKey(), amount);

  return NextResponse.redirect(new URL("/budget", request.url));
}
