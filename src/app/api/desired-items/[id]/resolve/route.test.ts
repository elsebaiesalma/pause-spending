import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { POST } from "./route";

function buildRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest("http://localhost:3000/api/desired-items/x/resolve", {
    method: "POST",
    body: form,
  });
}

async function ctxFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/desired-items/[id]/resolve", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  async function makeWaitingItem() {
    const user = await prisma.user.findFirstOrThrow();
    const item = await prisma.desiredItem.create({
      data: {
        userId: user.id,
        sourceType: "typed",
        itemName: "Navy Blazer",
        userConfirmed: true,
        pauseStatus: "waiting",
        waitUntil: new Date("2020-01-01"),
      },
    });
    createdIds.push(item.id);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);
    return item;
  }

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest({ outcome: "proceeded" }), await ctxFor("some-id"));

    expect(response.status).toBe(401);
  });

  it("records 'proceeded' and resolves pause_status", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "proceeded" }), await ctxFor(item.id));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("proceeded");
    expect(updated.decisionOutcome).toBe("proceeded");
  });

  it("records 'dropped' and resolves pause_status", async () => {
    const item = await makeWaitingItem();

    await POST(buildRequest({ outcome: "dropped" }), await ctxFor(item.id));

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("proceeded");
    expect(updated.decisionOutcome).toBe("dropped");
  });

  it("redirects a 'dropped' outcome to the Considering tab", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "dropped" }), await ctxFor(item.id));

    expect(response.headers.get("location")).toContain("/considering");
  });

  it("records 'saved_for_later' as its own pause_status, distinct from 'proceeded'", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "saved_for_later" }), await ctxFor(item.id));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toContain("/considering");

    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.pauseStatus).toBe("saved_for_later");
    expect(updated.decisionOutcome).toBe("saved_for_later");
  });

  it("redirects to the recommendations page on 'proceeded'", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "proceeded" }), await ctxFor(item.id));

    expect(response.headers.get("location")).toContain(`/desired-items/${item.id}/recommendations`);
  });

  it("still resolves the outcome when a reflection answer is included, even though its migration isn't applied yet", async () => {
    const item = await makeWaitingItem();

    const response = await POST(
      buildRequest({ outcome: "dropped", reflectionReplaces: "__nothing__", reflectionReasonAgainst: "too similar" }),
      await ctxFor(item.id)
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.decisionOutcome).toBe("dropped");
  });

  it("rejects an unrecognized outcome", async () => {
    const item = await makeWaitingItem();

    const response = await POST(buildRequest({ outcome: "maybe" }), await ctxFor(item.id));
    expect(response.status).toBe(400);

    const unchanged = await prisma.desiredItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.pauseStatus).toBe("waiting");
    expect(unchanged.decisionOutcome).toBeNull();
  });

  describe("cross-tenant isolation", () => {
    let fixture: TwoTenantFixture;

    afterEach(async () => {
      await fixture?.cleanup();
    });

    it("returns 404 and never resolves an item belonging to another user", async () => {
      fixture = await createTwoTenantFixture();
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

      const response = await POST(
        buildRequest({ outcome: "proceeded" }),
        await ctxFor(fixture.userB.desiredItem.id)
      );

      expect(response.status).toBe(404);

      const unchanged = await prisma.desiredItem.findUniqueOrThrow({
        where: { id: fixture.userB.desiredItem.id },
      });
      expect(unchanged.pauseStatus).toBe(fixture.userB.desiredItem.pauseStatus);
      expect(unchanged.decisionOutcome).toBeNull();
    });
  });
});
