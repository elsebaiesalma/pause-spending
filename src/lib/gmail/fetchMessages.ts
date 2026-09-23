const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

// Bounds how many messages a single backfill run will fetch details for,
// so a large inbox can't turn one sync into an unbounded, slow API-call
// storm. Revisit if a real backfill run needs more headroom.
const MAX_MESSAGES_PER_RUN = 500;

// Gmail's per-user quota is easily exhausted by firing one `messages.get`
// per candidate concurrently - fetch details in small batches instead.
const DETAIL_FETCH_BATCH_SIZE = 10;
const DETAIL_FETCH_BATCH_DELAY_MS = 1000;

// Narrows the candidate set to receipt/order-shaped emails at the query
// level. This is a coarse subject-keyword filter, not the fashion-specific
// classification (that's the rule-based/LLM classifier's job) - it just
// keeps a 6-month backfill from fetching every unrelated email in the
// inbox, which is both wasteful and enough to trip Gmail's rate limit.
const RECEIPT_SHAPED_SUBJECT_QUERY =
  '(subject:order OR subject:receipt OR subject:confirmation OR subject:shipped OR subject:delivered OR subject:invoice)';

export type GmailMessageSummary = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  internalDate: string;
};

function formatGmailDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

async function gmailFetch(accessToken: string, path: string): Promise<Response> {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail API request failed (${response.status}): ${body}`);
  }

  return response;
}

async function listMessageIds(accessToken: string, sinceDate: Date): Promise<string[]> {
  const query = `after:${formatGmailDate(sinceDate)} ${RECEIPT_SHAPED_SUBJECT_QUERY}`;
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ q: query, maxResults: "100" });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await gmailFetch(accessToken, `/messages?${params.toString()}`);
    const body = (await response.json()) as {
      messages?: { id: string }[];
      nextPageToken?: string;
    };

    for (const message of body.messages ?? []) {
      ids.push(message.id);
    }
    pageToken = body.nextPageToken;
  } while (pageToken && ids.length < MAX_MESSAGES_PER_RUN);

  return ids.slice(0, MAX_MESSAGES_PER_RUN);
}

async function getMessageSummary(
  accessToken: string,
  id: string
): Promise<GmailMessageSummary> {
  const params = new URLSearchParams({ format: "metadata" });
  params.append("metadataHeaders", "From");
  params.append("metadataHeaders", "Subject");

  const response = await gmailFetch(accessToken, `/messages/${id}?${params.toString()}`);
  const body = (await response.json()) as {
    id: string;
    snippet?: string;
    internalDate: string;
    payload?: { headers?: { name: string; value: string }[] };
  };

  const headers = body.payload?.headers ?? [];
  const from = headers.find((h) => h.name === "From")?.value ?? "";
  const subject = headers.find((h) => h.name === "Subject")?.value ?? "";

  return {
    id: body.id,
    from,
    subject,
    snippet: body.snippet ?? "",
    internalDate: body.internalDate,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

function findHtmlPart(part: GmailMessagePart | undefined): string | undefined {
  if (!part) return undefined;
  if (part.mimeType === "text/html" && part.body?.data) {
    return part.body.data;
  }
  for (const child of part.parts ?? []) {
    const found = findHtmlPart(child);
    if (found) return found;
  }
  return undefined;
}

// Fetches and decodes the full HTML body of a single message, for the
// receipt-extraction pass (Step 7) - only called for messages already
// classified in-scope, never for the whole candidate set.
export async function getMessageBody(accessToken: string, id: string): Promise<string> {
  const response = await gmailFetch(accessToken, `/messages/${id}?format=full`);
  const body = (await response.json()) as { payload?: GmailMessagePart };

  const base64url = findHtmlPart(body.payload);
  if (!base64url) {
    return "";
  }

  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

// Fetches header metadata only (From/Subject) - no message body - for
// receipt-shaped messages received since `sinceDate`. Fetches details in
// small batches to stay under Gmail's per-user rate limit rather than
// firing every request at once.
export async function fetchRecentMessages(
  accessToken: string,
  sinceDate: Date
): Promise<GmailMessageSummary[]> {
  const ids = await listMessageIds(accessToken, sinceDate);
  const summaries: GmailMessageSummary[] = [];

  for (let i = 0; i < ids.length; i += DETAIL_FETCH_BATCH_SIZE) {
    const batch = ids.slice(i, i + DETAIL_FETCH_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((id) => getMessageSummary(accessToken, id))
    );
    summaries.push(...batchResults);

    if (i + DETAIL_FETCH_BATCH_SIZE < ids.length) {
      await sleep(DETAIL_FETCH_BATCH_DELAY_MS);
    }
  }

  return summaries;
}
