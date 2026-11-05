import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractFromScreenshot } from "@/lib/itemExtraction/screenshotExtractor";
import { requireUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const form = await request.formData();
  const file = form.get("screenshot");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "screenshot file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const extraction = await extractFromScreenshot(base64, file.type || "image/png");

  const desiredItem = await prisma.desiredItem.create({
    data: {
      userId,
      sourceType: "screenshot",
      itemName: extraction?.itemName ?? null,
      price: extraction?.price?.toString() ?? null,
      userConfirmed: false,
      pauseStatus: "pending_confirmation",
    },
  });

  // 303, not the default 307: a 307 sends the browser back with the same POST
  // and its multipart body, and Next then tries to run that as a Server Action
  // on the confirm page ("Failed to find Server Action", a 500).
  return NextResponse.redirect(new URL(`/desired-items/${desiredItem.id}/confirm`, request.url), 303);
}
