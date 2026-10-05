import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractFromUrl } from "@/lib/itemExtraction/urlExtractor";
import { deriveQueryFromUrlSlug } from "@/lib/itemExtraction/searchProduct";
import { requireUserId } from "@/lib/session";

function titleCase(words: string): string {
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const form = await request.formData();
  const url = form.get("url")?.toString().trim();

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const extraction = await extractFromUrl(url);

  // A pasted URL IS the item - search is never used as a replacement for
  // it, even when direct extraction fails, since a search result is
  // necessarily a *different* page than the one the user explicitly gave.
  // When extraction fails, the URL's own slug still usually names the
  // product (e.g. "wool-coat-p12345" -> "Wool Coat p12345") - used as a
  // low-confidence itemName guess, never silently left blank, but the
  // pasted URL itself always stays the item's source, in rawInput.
  const slugGuess = extraction ? null : deriveQueryFromUrlSlug(url);

  const desiredItem = await prisma.desiredItem.create({
    data: {
      userId,
      sourceType: "url",
      rawInput: url,
      itemName: extraction?.itemName ?? (slugGuess ? titleCase(slugGuess) : null),
      itemNameConfidence: extraction ? null : slugGuess ? "low" : null,
      price: extraction?.price?.toString() ?? null,
      imageUrl: extraction?.imageUrl ?? null,
      category: extraction?.category ?? null,
      colorName: extraction?.colorName ?? null,
      colorFamily: extraction?.colorFamily ?? null,
      styleTags: extraction?.styleTags ?? [],
      userConfirmed: false,
      pauseStatus: "pending_confirmation",
    },
  });

  return NextResponse.redirect(new URL(`/desired-items/${desiredItem.id}/confirm`, request.url));
}
