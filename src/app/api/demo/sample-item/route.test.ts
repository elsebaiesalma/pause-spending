import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo";
import { POST } from "./route";

function buildRequest(origin?: string) {
  return new NextRequest("http://localhost:3000/api/demo/sample-item", {
    method: "POST",
    headers: origin ? { origin } : {},
  });
}

describe("POST /api/demo/sample-item", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await prisma.desiredItem.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });

  async function makeUser(domain: string) {
    const user = await prisma.user.create({
      data: { email: `sample-${Math.random().toString(36).slice(2, 8)}@${domain}` },
    });
    userIds.push(user.id);
    return user;
  }

  it("returns 401 without a session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    expect((await POST(buildRequest())).status).toBe(401);
  });

  it("rejects a cross-site request", async () => {
    const response = await POST(buildRequest("https://evil.example"));
    expect(response.status).toBe(403);
  });

  it("creates a confirmed sample item for a demo user and opens its pause screen", async () => {
    const user = await makeUser(DEMO_EMAIL_DOMAIN);
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest());

    expect(response.status).toBe(303);
    const items = await prisma.desiredItem.findMany({ where: { userId: user.id } });
    expect(items).toHaveLength(1);
    expect(items[0].userConfirmed).toBe(true);
    expect(items[0].itemName).toBe("Suede penny loafers");
    expect(response.headers.get("location")).toContain(`/desired-items/${items[0].id}/pause`);
  });

  it("does nothing for a real (non-demo) account", async () => {
    const user = await makeUser("example.com");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest());

    expect(response.status).toBe(404);
    expect(await prisma.desiredItem.count({ where: { userId: user.id } })).toBe(0);
  });
});
