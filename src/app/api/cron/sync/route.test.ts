import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/sync/scheduledSync", () => ({
  runScheduledSyncForAllConnections: vi.fn(),
}));

import { runScheduledSyncForAllConnections } from "@/lib/sync/scheduledSync";
import { POST } from "./route";

function buildRequest(authorization?: string) {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new NextRequest("http://localhost:3000/api/cron/sync", {
    method: "POST",
    headers,
  });
}

describe("POST /api/cron/sync", () => {
  afterEach(() => {
    vi.mocked(runScheduledSyncForAllConnections).mockReset();
  });

  it("rejects a request with no authorization header", async () => {
    const response = await POST(buildRequest());

    expect(response.status).toBe(401);
    expect(runScheduledSyncForAllConnections).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong secret", async () => {
    const response = await POST(buildRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(runScheduledSyncForAllConnections).not.toHaveBeenCalled();
  });

  it("runs the scheduled sync when the correct secret is provided", async () => {
    vi.mocked(runScheduledSyncForAllConnections).mockResolvedValueOnce([]);

    const response = await POST(buildRequest(`Bearer ${process.env.CRON_SECRET}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runScheduledSyncForAllConnections).toHaveBeenCalledTimes(1);
    expect(body.connectionsSynced).toBe(0);
  });
});
