import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWardrobeItem } from "@/lib/wardrobe";

function parseTags(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/wardrobe/[id]/update">) {
  const { id } = await ctx.params;
  const form = await request.formData();
  const itemName = form.get("itemName")?.toString().trim();

  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirstOrThrow();
  const ownedSinceRaw = form.get("ownedSince")?.toString();

  await updateWardrobeItem(id, user.id, {
    itemName,
    category: form.get("category")?.toString() || null,
    primaryColor: form.get("primaryColor")?.toString() || null,
    styleTags: parseTags(form.get("styleTags")?.toString() ?? null),
    useCaseTags: parseTags(form.get("useCaseTags")?.toString() ?? null),
    ownedSince: ownedSinceRaw ? new Date(ownedSinceRaw) : null,
  });

  return NextResponse.redirect(new URL("/wardrobe", request.url));
}
