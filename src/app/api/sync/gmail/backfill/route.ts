import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidGmailAccessToken } from "@/lib/emailConnections";
import { fetchRecentMessages, type GmailMessageSummary } from "@/lib/gmail/fetchMessages";
import { classifyEmail } from "@/lib/emailClassification/classifyEmail";
import { extractAndPersistPurchase } from "@/lib/emailExtraction/extractReceipt";
import { mapWithConcurrency } from "@/lib/concurrency";

const BACKFILL_WINDOW_MONTHS = 6;
const CLASSIFICATION_CONCURRENCY = 5;
const EXTRACTION_CONCURRENCY = 5;

function summarize(message: GmailMessageSummary) {
  return { id: message.id, from: message.from, subject: message.subject };
}

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

  const inScope: GmailMessageSummary[] = [];
  const outOfScope: GmailMessageSummary[] = [];
  const needsReview: GmailMessageSummary[] = [];

  for (const { message, result } of classifications) {
    if (result === "in_scope") inScope.push(message);
    else if (result === "out_of_scope") outOfScope.push(message);
    else needsReview.push(message);
  }

  await mapWithConcurrency(inScope, EXTRACTION_CONCURRENCY, (message) =>
    extractAndPersistPurchase({
      accessToken,
      userId: user.id,
      connectionId: connection.id,
      message,
    })
  );

  const purchasesCreated = await prisma.purchase.count({
    where: { userId: user.id, sourceEmailId: { in: inScope.map((m) => m.id) } },
  });

  return NextResponse.json({
    fetched: messages.length,
    inScope: inScope.length,
    outOfScope: outOfScope.length,
    needsReview: needsReview.length,
    purchasesCreated,
    inScopeEmails: inScope.map(summarize),
    needsReviewEmails: needsReview.map(summarize),
  });
}
