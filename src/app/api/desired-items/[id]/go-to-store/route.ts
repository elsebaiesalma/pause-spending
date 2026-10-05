import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { retailerFromRawInput } from "@/lib/stillWantIt/retailer";
import { recordStoreVisit } from "@/lib/stillWantIt/storeVisit";

// The "Go to [retailer]" link on the Still want it page. It is a plain link
// that opens in a new tab, so this records the visit and redirects, rather
// than being a POST. Recording happens before the redirect, so the visit is
// captured even if the retailer's page is slow to load.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/desired-items/[id]/go-to-store">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const item = await prisma.desiredItem.findFirst({ where: { id, userId }, select: { rawInput: true } });
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const retailer = retailerFromRawInput(item.rawInput);
  if (!retailer) {
    return NextResponse.redirect(new URL(`/desired-items/${id}/still-want-it`, request.url));
  }

  await recordStoreVisit(id, userId, new Date());
  return NextResponse.redirect(retailer.url);
}
