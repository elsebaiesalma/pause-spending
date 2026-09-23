import { prisma } from "@/lib/prisma";

export default async function Home() {
  const user = await prisma.user.findFirst();
  const gmailConnection = user
    ? await prisma.emailConnection.findUnique({
        where: { userId_provider: { userId: user.id, provider: "gmail" } },
      })
    : null;

  return (
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Pause Before Purchase</h1>

      {gmailConnection?.status === "connected" ? (
        <p>
          Gmail connected since{" "}
          {gmailConnection.connectedAt.toLocaleString()}.
        </p>
      ) : (
        <a href="/connect/gmail">Connect Gmail</a>
      )}
    </main>
  );
}
