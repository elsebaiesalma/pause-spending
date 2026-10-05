import { NextRequest, NextResponse } from "next/server";
import { markWardrobeItemReturned } from "@/lib/wardrobe";
import { requireUserId } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/wardrobe/[id]/return">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;

  try {
    await markWardrobeItemReturned(id, userId);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/wardrobe", request.url));
}
