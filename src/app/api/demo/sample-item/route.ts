import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isDemoEmail, SAMPLE_ITEM } from "@/lib/demo";

// "Try a sample item": adds one confirmed item to a demo closet and opens its
// pause screen, so a first-time visitor sees the whole product in one click
// instead of filling in a form. Demo accounts only; a real account has no use
// for a made-up item.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!isDemoEmail(user?.email)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const item = await prisma.desiredItem.create({
    data: {
      userId,
      sourceType: "typed",
      rawInput: SAMPLE_ITEM.itemName,
      itemName: SAMPLE_ITEM.itemName,
      brand: SAMPLE_ITEM.brand,
      price: SAMPLE_ITEM.price,
      imageUrl: SAMPLE_ITEM.imageUrl,
      category: SAMPLE_ITEM.category,
      colorName: SAMPLE_ITEM.colorName,
      colorFamily: SAMPLE_ITEM.colorFamily,
      styleTags: [...SAMPLE_ITEM.styleTags],
      userConfirmed: true,
      userEdited: true,
    },
  });

  return NextResponse.redirect(new URL(`/desired-items/${item.id}/pause`, request.url), 303);
}
