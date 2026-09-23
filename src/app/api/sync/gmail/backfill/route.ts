import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidGmailAccessToken } from "@/lib/emailConnections";
import { fetchRecentMessages } from "@/lib/gmail/fetchMessages";
import { classifyEmailByRules } from "@/lib/emailClassification/ruleBasedFilter";

const BACKFILL_WINDOW_MONTHS = 6;

export async function POST() {
  const user = await prisma.user.findFirstOrThrow();

  const connection = await prisma.emailConnection.findFirst({
    where: { userId: user.id, provider: "gmail", status: "connected" },
  });

  if (!connection) {
    return NextResponse.json({ error: "no_connected_gmail_account" }, { status: 404 });
  }

  const accessToken = await getValidGmailAccessToken(connection.id);

  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - BACKFILL_WINDOW_MONTHS);

  const messages = await fetchRecentMessages(accessToken, sinceDate);

  const inScope: { id: string; from: string; subject: string }[] = [];
  const outOfScope: { id: string; from: string; subject: string }[] = [];
  const ambiguous: { id: string; from: string; subject: string }[] = [];

  for (const message of messages) {
    const result = classifyEmailByRules(message);
    const summary = { id: message.id, from: message.from, subject: message.subject };
    if (result === "in_scope") inScope.push(summary);
    else if (result === "out_of_scope") outOfScope.push(summary);
    else ambiguous.push(summary);
  }

  return NextResponse.json({
    fetched: messages.length,
    inScope: inScope.length,
    outOfScope: outOfScope.length,
    ambiguous: ambiguous.length,
    inScopeEmails: inScope,
    ambiguousEmails: ambiguous,
  });
}
