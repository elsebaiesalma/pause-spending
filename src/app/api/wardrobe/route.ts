import { NextRequest, NextResponse } from "next/server";
import { createManualWardrobeItem } from "@/lib/wardrobe";
import { requireUserId } from "@/lib/session";
import { COLOR_FAMILIES, isColorFamily } from "@/lib/colorFamily";
import { MAX_BRAND_LENGTH, parsePrice } from "@/lib/pieceForm";
import { resolveColor } from "@/lib/colorResolve";
import { photoChangeFromForm } from "@/lib/photos/photoStore";

function parseTags(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const form = await request.formData();
  const itemName = form.get("itemName")?.toString().trim();

  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const price = parsePrice(form.get("price")?.toString() ?? "");
  if (!price.ok) {
    return NextResponse.json({ error: "price must be a number like 49.99" }, { status: 400 });
  }
  const brand = form.get("brand")?.toString().trim().slice(0, MAX_BRAND_LENGTH) || null;

  const ownedSinceRaw = form.get("ownedSince")?.toString();
  const colorFamily = form.get("colorFamily")?.toString().trim() || null;
  if (colorFamily && !isColorFamily(colorFamily)) {
    return NextResponse.json(
      { error: `colorFamily must be one of: ${COLOR_FAMILIES.join(", ")}` },
      { status: 400 }
    );
  }

  // A typed colour ("Other") is filed under its closest family; a chosen family is kept.
  const color = await resolveColor({ colorFamily, colorName: form.get("colorName")?.toString() });

  const photo = await photoChangeFromForm(userId, form);
  if (photo.change === "error") return NextResponse.json({ error: photo.message }, { status: 400 });

  await createManualWardrobeItem({
    userId,
    itemName,
    category: form.get("category")?.toString() || null,
    brand,
    price: price.value,
    colorName: color.colorName,
    colorFamily: color.colorFamily,
    styleTags: parseTags(form.get("styleTags")?.toString() ?? null),
    useCaseTags: parseTags(form.get("useCaseTags")?.toString() ?? null),
    ownedSince: ownedSinceRaw ? new Date(ownedSinceRaw) : null,
    imageUrl: photo.change === "set" ? photo.url : null,
  });

  // 303: the form posts multipart, which a 307 would re-send to the next page.
  return NextResponse.redirect(new URL("/wardrobe", request.url), 303);
}
