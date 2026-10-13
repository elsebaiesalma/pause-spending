import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { ForeignItemError, LookNotFoundError, deleteLook, renameLook, saveLook } from "@/lib/looks/looks";
import { renameLookSchema, saveLookSchema } from "@/lib/looks/schemas";

// Replaces a look's pieces (and optionally its name and wanted-item link).
// Someone else's look is a 404, the same as one that does not exist.
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/looks/[id]">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await ctx.params;

  const parsed = saveLookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_look" }, { status: 400 });

  try {
    const savedId = await saveLook(userId, { ...parsed.data, lookId: id });
    return NextResponse.json({ id: savedId });
  } catch (error) {
    if (error instanceof ForeignItemError) return NextResponse.json({ error: "foreign_item" }, { status: 400 });
    if (error instanceof LookNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/looks/[id]">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await ctx.params;

  const parsed = renameLookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_name" }, { status: 400 });

  try {
    await renameLook(userId, id, parsed.data.name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LookNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/looks/[id]">) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await ctx.params;

  try {
    await deleteLook(userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LookNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
