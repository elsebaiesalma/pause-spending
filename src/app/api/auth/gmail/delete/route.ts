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
    console.error("Failed to revoke Gmail token during permanent delete:", error);
  }

  // Cascades (via onDelete: Cascade in the schema) to every purchase sourced
  // from this connection, and from there to every wardrobe item sourced from
  // those purchases - a full purge of data derived from this connection.
  await prisma.emailConnection.delete({ where: { id: connection.id } });

  return NextResponse.redirect(new URL("/", request.url));
}
