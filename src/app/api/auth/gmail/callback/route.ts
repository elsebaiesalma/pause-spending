import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/oauth/google";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get("gmail_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  const tokens = await exchangeCodeForTokens(code);

  const envelope = encrypt(
    JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    })
  );

  await prisma.emailConnection.upsert({
    where: { userId_provider: { userId: session.user.id, provider: "gmail" } },
    create: {
      userId: session.user.id,
      provider: "gmail",
      encryptedToken: envelope,
      status: "connected",
    },
    update: {
      encryptedToken: envelope,
      status: "connected",
      connectedAt: new Date(),
    },
  });

  const response = NextResponse.redirect(new URL("/connect/gmail/success", request.url));
  response.cookies.delete("gmail_oauth_state");
  return response;
}
