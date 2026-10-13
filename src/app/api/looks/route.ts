import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { ForeignItemError, saveLook } from "@/lib/looks/looks";
import { saveLookSchema } from "@/lib/looks/schemas";

// Creates a look from a board. An empty board is not saved: the response is
// { id: null }. A wardrobe item or wanted item that is not the signed-in
// user's is a 400, and nothing is written.
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const parsed = saveLookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_look" }, { status: 400 });

  try {
    const id = await saveLook(userId, parsed.data);
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof ForeignItemError) return NextResponse.json({ error: "foreign_item" }, { status: 400 });
    throw error;
  }
}
