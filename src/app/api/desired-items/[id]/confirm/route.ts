import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/desired-items/[id]/confirm">
) {
  const { id } = await ctx.params;
  const form = await request.formData();

  const itemName = form.get("itemName")?.toString().trim();
  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const priceRaw = form.get("price")?.toString();
  const price = priceRaw ? Number(priceRaw) : null;
  const imageUrl = form.get("imageUrl")?.toString().trim() || null;
  const category = form.get("category")?.toString().trim() || null;
  const primaryColor = form.get("primaryColor")?.toString().trim() || null;
  const styleTags =
    form
      .get("styleTags")
      ?.toString()
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? [];

  const user = await prisma.user.findFirstOrThrow();

  await prisma.desiredItem.update({
    where: { id, userId: user.id },
    data: {
      itemName,
      price: price !== null && Number.isFinite(price) ? price.toString() : null,
      imageUrl,
      category,
      primaryColor,
      styleTags,
      userConfirmed: true,
    },
  });

  return NextResponse.redirect(new URL(`/desired-items/${id}/pause`, request.url));
}
