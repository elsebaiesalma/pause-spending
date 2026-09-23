import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markWardrobeItemReturned } from "@/lib/wardrobe";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/wardrobe/[id]/return">) {
  const { id } = await ctx.params;
  const user = await prisma.user.findFirstOrThrow();

  await markWardrobeItemReturned(id, user.id);

  return NextResponse.redirect(new URL("/wardrobe", request.url));
}
