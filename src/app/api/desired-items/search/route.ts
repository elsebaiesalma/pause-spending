import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { searchForItem } from "@/lib/itemExtraction/searchProduct";

const MIN_QUERY_LENGTH = 3;

// GET /api/desired-items/search?q=... - the search box's backend. Auth-gated
// like every other desired-items endpoint, even though search itself
// touches no user data, so it can't be used as a free proxy for Brave
// Search by a signed-out caller.
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ error: "query must be at least 3 characters" }, { status: 400 });
  }

  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return NextResponse.json({ error: "search_unavailable" }, { status: 503 });
  }

  try {
    const result = await searchForItem(query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Item search failed:", error);
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }
}
