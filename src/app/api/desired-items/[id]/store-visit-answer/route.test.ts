import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { POST } from "./route";

function buildRequest(id: string, fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new NextRequest(`http://localhost:3000/api/desired-items/${id}/store-visit-answer`, {
    method: "POST",
    body: form,
  });
}

const ctxFor = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/desired-items/[id]/store-visit-answer", () => {
  let fixture: TwoTenantFixture | undefined;

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await fixture?.cleanup();
    fixture = undefined;
  });

  it("returns 404 for an id that is not a UUID, before touching the database", async () => {
    fixture = await createTwoTenantFixture();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

    const response = await POST(buildRequest("not-a-uuid", { answer: "not_sure" }), ctxFor("not-a-uuid"));

    expect(response.status).toBe(404);
  });

  it("returns 400 for an answer outside the three allowed values", async () => {
    fixture = await createTwoTenantFixture();
    const id = fixture.userA.desiredItem.id;
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

    const response = await POST(buildRequest(id, { answer: "proceeded" }), ctxFor(id));

    expect(response.status).toBe(400);
  });

  it("refuses 'bought' without a positive price, and leaves the item unchanged", async () => {
    fixture = await createTwoTenantFixture();
    const id = fixture.userA.desiredItem.id;
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

    const response = await POST(buildRequest(id, { answer: "bought", price: "0" }), ctxFor(id));

    expect(response.status).toBe(400);
    const unchanged = await prisma.desiredItem.findUniqueOrThrow({ where: { id } });
    expect(unchanged.pauseStatus).toBe(fixture.userA.desiredItem.pauseStatus);
    expect(unchanged.decisionOutcome).toBeNull();
  });

  it("cannot change another user's item: returns 404 and leaves it untouched", async () => {
    fixture = await createTwoTenantFixture();
    const otherUsersItem = fixture.userB.desiredItem;
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

    const response = await POST(buildRequest(otherUsersItem.id, { answer: "bought", price: "50" }), ctxFor(otherUsersItem.id));

    expect(response.status).toBe(404);
    const unchanged = await prisma.desiredItem.findUniqueOrThrow({ where: { id: otherUsersItem.id } });
    expect(unchanged.decisionOutcome).toBeNull();
    expect(unchanged.price?.toString()).not.toBe("50");
  });

  it("'bought' with a valid price moves the item to purchased (proceeded), outside the Kept total", async () => {
    fixture = await createTwoTenantFixture();
    const id = fixture.userA.desiredItem.id;
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: fixture.userA.user.id } } as never);

    const response = await POST(buildRequest(id, { answer: "bought", price: "89.90" }), ctxFor(id));

    expect(response.status).toBe(307);
    const updated = await prisma.desiredItem.findUniqueOrThrow({ where: { id } });
    expect(updated.pauseStatus).toBe("proceeded");
    expect(updated.decisionOutcome).toBe("proceeded");
    expect(Number(updated.price)).toBe(89.9);
  });
});
