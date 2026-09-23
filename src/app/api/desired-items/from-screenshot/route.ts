import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractFromScreenshot } from "@/lib/itemExtraction/screenshotExtractor";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("screenshot");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "screenshot file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const extraction = await extractFromScreenshot(base64, file.type || "image/png");

  const user = await prisma.user.findFirstOrThrow();

  const desiredItem = await prisma.desiredItem.create({
    data: {
      userId: user.id,
      sourceType: "screenshot",
      itemName: extraction?.itemName ?? null,
      price: extraction?.price?.toString() ?? null,
      userConfirmed: false,
      pauseStatus: "pending_confirmation",
    },
  });

  return NextResponse.redirect(new URL(`/desired-items/${desiredItem.id}/confirm`, request.url));
}
