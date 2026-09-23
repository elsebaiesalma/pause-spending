import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractFromUrl } from "@/lib/itemExtraction/urlExtractor";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const url = form.get("url")?.toString().trim();

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const extraction = await extractFromUrl(url);
  const user = await prisma.user.findFirstOrThrow();

  const desiredItem = await prisma.desiredItem.create({
    data: {
      userId: user.id,
      sourceType: "url",
      rawInput: url,
      itemName: extraction?.itemName ?? null,
      price: extraction?.price?.toString() ?? null,
      imageUrl: extraction?.imageUrl ?? null,
      category: extraction?.category ?? null,
      primaryColor: extraction?.primaryColor ?? null,
      styleTags: extraction?.styleTags ?? [],
      userConfirmed: false,
      pauseStatus: "pending_confirmation",
    },
  });

  return NextResponse.redirect(new URL(`/desired-items/${desiredItem.id}/confirm`, request.url));
}
