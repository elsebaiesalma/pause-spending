import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { extractWardrobeItemTags } from "@/lib/tagging/llmTagger";
import { MAX_NAME_LENGTH, toSuggestion } from "@/lib/pieceForm";

// Suggests a category, colour and tags for a piece the person is still typing,
// so they can accept or change them before saving. Nothing is stored here. A
// failed model call answers `suggestion: null`: the form then just says it
// could not suggest, and the person adds their own (or leaves it, and the
// piece is tagged on save as before).
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const body = (await request.json().catch(() => null)) as { itemName?: unknown; category?: unknown } | null;
  const itemName = typeof body?.itemName === "string" ? body.itemName.trim() : "";
  if (!itemName || itemName.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }
  const category = typeof body?.category === "string" && body.category.trim() ? body.category.trim() : null;

  try {
    const tags = await extractWardrobeItemTags({ itemName, category, imageUrl: null });
    return NextResponse.json({ suggestion: toSuggestion(tags) });
  } catch (error) {
    console.warn("Tag suggestion failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ suggestion: null });
  }
}
