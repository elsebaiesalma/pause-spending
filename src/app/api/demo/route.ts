import { NextRequest, NextResponse } from "next/server";
import { createDemoSession } from "@/lib/demo";

// "Try the demo": creates a fresh demo account with the sample wardrobe and
// signs the visitor straight in, then lands them on Home.
export async function POST(request: NextRequest) {
  // Only from our own pages: another site posting a form here would otherwise
  // sign its visitors into a throwaway account and create rows for nothing.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { sessionToken, expires } = await createDemoSession();

  // Same cookie Auth.js sets after a sign-in. Auth.js picks the __Secure-
  // prefixed name whenever the site is served over https (its default
  // useSecureCookies), so match that exactly or auth() won't find it.
  const secure =
    request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.cookies.set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires,
  });
  return response;
}
