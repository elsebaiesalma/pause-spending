import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockReset();
  });

  it("returns 200 with db ok when the database round-trip succeeds", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", db: "ok" });
  });

  it("returns 503 without throwing when the database connection fails", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "error", db: "error" });
  });
});
