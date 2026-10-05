import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "@/lib/oauth/google";
import { auth } from "@/lib/auth";

// Connecting Gmail is a second, separate consent step after signing into
// the app itself - it must never be reachable by a signed-out visitor.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildGoogleAuthorizationUrl(state));

  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });

  return response;
}
