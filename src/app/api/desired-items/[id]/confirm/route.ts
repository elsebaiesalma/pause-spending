import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { COLOR_FAMILIES, isColorFamily } from "@/lib/colorFamily";
import { resolveColor } from "@/lib/colorResolve";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/desired-items/[id]/confirm">
) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  const form = await request.formData();

  const itemName = form.get("itemName")?.toString().trim();
  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const brand = form.get("brand")?.toString().trim() || null;
  const priceRaw = form.get("price")?.toString();
  const price = priceRaw ? Number(priceRaw) : null;
  const imageUrl = form.get("imageUrl")?.toString().trim() || null;
  const category = form.get("category")?.toString().trim() || null;
  // Omitted/empty is legitimately "unknown" and stays null - only a
  // non-empty value outside the fixed list is malformed input, and silently
  // nulling that would drop the item out of color matching with no signal
  // that anything went wrong.
  const colorFamily = form.get("colorFamily")?.toString().trim() || null;
  if (colorFamily && !isColorFamily(colorFamily)) {
    return NextResponse.json(
      { error: `colorFamily must be one of: ${COLOR_FAMILIES.join(", ")}` },
      { status: 400 }
    );
  }
  const color = await resolveColor({ colorFamily, colorName: form.get("colorName")?.toString() });
  const styleTags =
    form
      .get("styleTags")
      ?.toString()
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? [];

  try {
    await prisma.desiredItem.update({
      where: { id, userId },
      data: {
        itemName,
        // The user has now explicitly reviewed/edited this name (even if
        // they left it unchanged) - it's confirmed, not a guess anymore.
        itemNameConfidence: null,
        brand,
        price: price !== null && Number.isFinite(price) ? price.toString() : null,
        imageUrl,
        category,
        colorName: color.colorName,
        colorFamily: color.colorFamily,
        styleTags,
        userConfirmed: true,
        userEdited: true,
      },
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.redirect(new URL(`/desired-items/${id}/pause`, request.url));
}
