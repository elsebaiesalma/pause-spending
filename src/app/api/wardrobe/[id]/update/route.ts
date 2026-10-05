import { NextRequest, NextResponse } from "next/server";
import { updateWardrobeItem } from "@/lib/wardrobe";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { COLOR_FAMILIES, isColorFamily } from "@/lib/colorFamily";

function parseTags(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/wardrobe/[id]/update">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  const form = await request.formData();
  const itemName = form.get("itemName")?.toString().trim();

  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const ownedSinceRaw = form.get("ownedSince")?.toString();
  const colorFamily = form.get("colorFamily")?.toString().trim() || null;
  if (colorFamily && !isColorFamily(colorFamily)) {
    return NextResponse.json(
      { error: `colorFamily must be one of: ${COLOR_FAMILIES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await updateWardrobeItem(id, userId, {
      itemName,
      category: form.get("category")?.toString() || null,
      colorName: form.get("colorName")?.toString().trim() || null,
      colorFamily,
      styleTags: parseTags(form.get("styleTags")?.toString() ?? null),
      useCaseTags: parseTags(form.get("useCaseTags")?.toString() ?? null),
      ownedSince: ownedSinceRaw ? new Date(ownedSinceRaw) : null,
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/wardrobe", request.url));
}
