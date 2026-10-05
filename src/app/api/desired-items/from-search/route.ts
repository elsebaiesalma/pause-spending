import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { isColorFamily } from "@/lib/colorFamily";

// Creates a desired item from a candidate the search box already extracted
// (see searchProduct.ts) - the candidate's fields are submitted directly as
// hidden form fields rather than re-fetching/re-extracting the URL here, so
// picking a card doesn't cost a second page fetch or LLM call. Lands on the
// exact same confirm step every other input path uses.
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const form = await request.formData();
  const url = form.get("url")?.toString().trim();
  const itemName = form.get("itemName")?.toString().trim();

  if (!url || !itemName) {
    return NextResponse.json({ error: "url and itemName are required" }, { status: 400 });
  }

  const priceRaw = form.get("price")?.toString();
  const price = priceRaw ? Number(priceRaw) : null;
  const colorFamilyRaw = form.get("colorFamily")?.toString().trim() || null;

  const desiredItem = await prisma.desiredItem.create({
    data: {
      userId,
      sourceType: "search",
      rawInput: url,
      itemName,
      itemNameConfidence: form.get("itemNameConfidence")?.toString().trim() || null,
      brand: form.get("brand")?.toString().trim() || null,
      price: price !== null && Number.isFinite(price) ? price.toString() : null,
      imageUrl: form.get("imageUrl")?.toString().trim() || null,
      category: form.get("category")?.toString().trim() || null,
      colorName: form.get("colorName")?.toString().trim() || null,
      colorFamily: colorFamilyRaw && isColorFamily(colorFamilyRaw) ? colorFamilyRaw : null,
      userConfirmed: false,
      pauseStatus: "pending_confirmation",
    },
  });

  return NextResponse.redirect(new URL(`/desired-items/${desiredItem.id}/confirm`, request.url));
}
