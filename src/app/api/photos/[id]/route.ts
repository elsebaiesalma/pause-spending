import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { readPhoto } from "@/lib/photos/photoStore";

// A person's own photos, and only theirs. The id is a random UUID that never
// changes the bytes behind it, so the browser can keep it for a long time.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/photos/[id]">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const photo = await readPhoto(userId, id);
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
