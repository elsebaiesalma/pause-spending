import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const text = form.get("text")?.toString().trim();

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirstOrThrow();

  const desiredItem = await prisma.desiredItem.create({
    data: {
      userId: user.id,
      sourceType: "typed",
      rawInput: text,
      itemName: text,
      userConfirmed: false,
      pauseStatus: "pending_confirmation",
    },
  });

  return NextResponse.redirect(new URL(`/desired-items/${desiredItem.id}/confirm`, request.url));
}
