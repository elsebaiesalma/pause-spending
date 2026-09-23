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

import { getValidGmailAccessToken } from "@/lib/emailConnections";
import { fetchRecentMessages } from "@/lib/gmail/fetchMessages";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const FIXTURE_MESSAGES = [
  { id: "1", from: "orders@nike.com", subject: "Your Nike Order Confirmation", internalDate: "0" },
  { id: "2", from: "receipts@instacart.com", subject: "Your grocery receipt", internalDate: "0" },
  { id: "3", from: "orders@target.com", subject: "Your Target order", internalDate: "0" },
];

describe("POST /api/sync/gmail/backfill", () => {
  afterEach(async () => {
    vi.mocked(getValidGmailAccessToken).mockReset();
    vi.mocked(fetchRecentMessages).mockReset();
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

  it("classifies fetched messages and reports counts by category", async () => {
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

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.fetched).toBe(3);
    expect(body.inScope).toBe(1);
    expect(body.outOfScope).toBe(1);
    expect(body.ambiguous).toBe(1);
    expect(body.inScopeEmails).toEqual([
      { id: "1", from: "orders@nike.com", subject: "Your Nike Order Confirmation" },
    ]);
    expect(body.ambiguousEmails).toEqual([
      { id: "3", from: "orders@target.com", subject: "Your Target order" },
    ]);
  });
});
