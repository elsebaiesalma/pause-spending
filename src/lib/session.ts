import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// For API route handlers. Returns the userId on success, or an already-built
// 401 NextResponse on failure - callers check with `typeof result !== "string"`
// and return it directly, so there's no separate try/catch per route and no
// route can accidentally fall through to acting on an empty/undefined userId.
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return session.user.id;
}

// For Server Component pages: redirects to /login instead of throwing,
// since there's no response to shape here - navigating away is the correct
// "you're not signed in" behavior for a page render.
export async function requireUserIdOrRedirect(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}
