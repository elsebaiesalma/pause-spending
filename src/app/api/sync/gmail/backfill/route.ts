import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidGmailAccessToken } from "@/lib/emailConnections";
import { fetchRecentMessages } from "@/lib/gmail/fetchMessages";
import { classifyEmail } from "@/lib/emailClassification/classifyEmail";
import { mapWithConcurrency } from "@/lib/concurrency";

const BACKFILL_WINDOW_MONTHS = 6;
const CLASSIFICATION_CONCURRENCY = 5;

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

  const classifications = await mapWithConcurrency(
    messages,
    CLASSIFICATION_CONCURRENCY,
    async (message) => ({
      message,
      result: await classifyEmail(message),
    })
  );

  const inScope: { id: string; from: string; subject: string }[] = [];
  const outOfScope: { id: string; from: string; subject: string }[] = [];
  const needsReview: { id: string; from: string; subject: string }[] = [];

  for (const { message, result } of classifications) {
    const summary = { id: message.id, from: message.from, subject: message.subject };
    if (result === "in_scope") inScope.push(summary);
    else if (result === "out_of_scope") outOfScope.push(summary);
    else needsReview.push(summary);
  }

  return NextResponse.json({
    fetched: messages.length,
    inScope: inScope.length,
    outOfScope: outOfScope.length,
    needsReview: needsReview.length,
    inScopeEmails: inScope,
    needsReviewEmails: needsReview,
  });
}
