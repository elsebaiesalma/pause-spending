import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/emailConnections", async () => {
  const actual = await vi.importActual<typeof import("@/lib/emailConnections")>(
    "@/lib/emailConnections"
  );
  return { ...actual, getValidGmailAccessToken: vi.fn() };
});

vi.mock("@/lib/gmail/fetchMessages", () => ({
  fetchRecentMessages: vi.fn(),
}));

vi.mock("@/lib/emailClassification/classifyEmail", () => ({
  classifyEmail: vi.fn(),
}));

vi.mock("@/lib/emailExtraction/extractReceipt", () => ({
  extractAndPersistPurchase: vi.fn(),
}));

import { getValidGmailAccessToken } from "@/lib/emailConnections";
import { fetchRecentMessages } from "@/lib/gmail/fetchMessages";
import { classifyEmail } from "@/lib/emailClassification/classifyEmail";
import { extractAndPersistPurchase } from "@/lib/emailExtraction/extractReceipt";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const FIXTURE_MESSAGES = [
  {
    id: "1",
    from: "orders@nike.com",
    subject: "Your Nike Order Confirmation",
    snippet: "",
    internalDate: "0",
  },
  {
    id: "2",
    from: "receipts@instacart.com",
    subject: "Your grocery receipt",
    snippet: "",
    internalDate: "0",
  },
  {
    id: "3",
    from: "orders@target.com",
    subject: "Your Target order",
    snippet: "",
    internalDate: "0",
  },
];

describe("POST /api/sync/gmail/backfill", () => {
  afterEach(async () => {
    vi.mocked(getValidGmailAccessToken).mockReset();
    vi.mocked(fetchRecentMessages).mockReset();
    vi.mocked(classifyEmail).mockReset();
    vi.mocked(extractAndPersistPurchase).mockReset();
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.emailConnection.deleteMany({ where: { userId: user.id, provider: "gmail" } });
    }
  });

  it("returns 404 and never fetches when there is no connected gmail account", async () => {
    const response = await POST();

    expect(response.status).toBe(404);
    expect(fetchRecentMessages).not.toHaveBeenCalled();
  });

  it("returns 404 and never fetches when the connection is disconnected", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await prisma.emailConnection.create({
      data: {
        userId: user.id,
        provider: "gmail",
        encryptedToken: encrypt("{}"),
        status: "disconnected",
      },
    });

    const response = await POST();

    expect(response.status).toBe(404);
    expect(fetchRecentMessages).not.toHaveBeenCalled();
  });

  it("classifies every fetched message and reports counts with zero left unresolved", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await prisma.emailConnection.create({
      data: {
        userId: user.id,
        provider: "gmail",
        encryptedToken: encrypt("{}"),
        status: "connected",
      },
    });
    vi.mocked(getValidGmailAccessToken).mockResolvedValueOnce("fake-access-token");
    vi.mocked(fetchRecentMessages).mockResolvedValueOnce(FIXTURE_MESSAGES);
    vi.mocked(classifyEmail).mockImplementation(async (email) => {
      if (email.id === "1") return "in_scope";
      if (email.id === "2") return "out_of_scope";
      return "needs_review";
    });
    vi.mocked(extractAndPersistPurchase).mockResolvedValue(undefined);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.fetched).toBe(3);
    expect(body.inScope).toBe(1);
    expect(body.outOfScope).toBe(1);
    expect(body.needsReview).toBe(1);
    expect(body.inScope + body.outOfScope + body.needsReview).toBe(body.fetched);
    expect(body.inScopeEmails).toEqual([
      { id: "1", from: "orders@nike.com", subject: "Your Nike Order Confirmation" },
    ]);
    expect(body.needsReviewEmails).toEqual([
      { id: "3", from: "orders@target.com", subject: "Your Target order" },
    ]);

    // Extraction only runs for the in-scope message, never for out-of-scope
    // or needs-review ones.
    expect(extractAndPersistPurchase).toHaveBeenCalledTimes(1);
    expect(extractAndPersistPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.objectContaining({ id: "1" }) })
    );
  });
});
