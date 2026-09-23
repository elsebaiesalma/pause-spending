import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonthKey, setBudgetForMonth } from "@/lib/budget";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const amountRaw = form.get("amount")?.toString();
  const amount = amountRaw ? Number(amountRaw) : NaN;

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
  }

  const user = await prisma.user.findFirstOrThrow();
  await setBudgetForMonth(user.id, currentMonthKey(), amount);

  return NextResponse.redirect(new URL("/budget", request.url));
}
