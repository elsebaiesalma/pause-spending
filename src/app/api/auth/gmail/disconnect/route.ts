import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revokeConnectionToken } from "@/lib/emailConnections";

export async function POST(request: NextRequest) {
  const user = await prisma.user.findFirstOrThrow();
  const connection = await prisma.emailConnection.findUnique({
    where: { userId_provider: { userId: user.id, provider: "gmail" } },
  });

  if (!connection) {
    return NextResponse.json({ error: "not_connected" }, { status: 404 });
  }

  try {
    await revokeConnectionToken(connection.provider, connection.encryptedToken);
  } catch (error) {
    console.error("Failed to revoke Gmail token during disconnect:", error);
  }

  // Disconnect stops sync and revokes access, but deliberately keeps every
  // already-parsed purchase/wardrobe row untouched - only "permanently
  // delete" purges derived data.
  await prisma.emailConnection.update({
    where: { id: connection.id },
    data: { status: "disconnected" },
  });

  return NextResponse.redirect(new URL("/", request.url));
}
