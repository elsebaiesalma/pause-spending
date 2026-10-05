import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Only the "leaves colorFamily null when omitted" test hits this path (no
// color/style/use-case tags given, so createManualWardrobeItem would
// otherwise run the real LLM tagger) - stubbed here so the test is fast and
// deterministic, matching wardrobe.test.ts's convention.
vi.mock("@/lib/tagging/tagWardrobeItem", () => ({
  ensureWardrobeItemTagged: vi.fn(async (item) => item),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest("http://localhost:3000/api/wardrobe", { method: "POST", body: form });
}

describe("POST /api/wardrobe", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await prisma.wardrobeItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("returns 401 when there is no active session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await POST(buildRequest({ itemName: "Navy Boots" }));

    expect(response.status).toBe(401);
  });

  it("creates a manual item with a valid colorFamily", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({ itemName: "Navy Boots", colorName: "navy", colorFamily: "navy" })
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.wardrobeItem.findFirstOrThrow({ where: { itemName: "Navy Boots" } });
    createdIds.push(item.id);
    expect(item.colorFamily).toBe("navy");
  });

  it("rejects (400) an out-of-list colorFamily rather than silently nulling it, and never creates a row", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(
      buildRequest({ itemName: "Rejected Item", colorFamily: "not-a-real-family" })
    );

    expect(response.status).toBe(400);

    const found = await prisma.wardrobeItem.findFirst({ where: { itemName: "Rejected Item" } });
    expect(found).toBeNull();
  });

  it("leaves colorFamily null when omitted entirely - that's legitimately unknown, not an error", async () => {
    const user = await prisma.user.findFirstOrThrow();
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: user.id } } as never);

    const response = await POST(buildRequest({ itemName: "Untagged Item" }));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.wardrobeItem.findFirstOrThrow({ where: { itemName: "Untagged Item" } });
    createdIds.push(item.id);
    expect(item.colorFamily).toBeNull();
  });
});
