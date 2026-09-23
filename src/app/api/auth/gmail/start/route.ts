import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "@/lib/oauth/google";

export async function GET() {
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
