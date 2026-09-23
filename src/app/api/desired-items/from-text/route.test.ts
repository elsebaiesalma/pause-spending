import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function buildRequest(text: string) {
  const form = new FormData();
  form.set("text", text);
  return new NextRequest("http://localhost:3000/api/desired-items/from-text", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/desired-items/from-text", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    await prisma.desiredItem.deleteMany({ where: { id: { in: createdIds } } });
    createdIds.length = 0;
  });

  it("creates an unconfirmed desired item using the typed text directly, with no extraction step", async () => {
    const response = await POST(buildRequest("navy wool blazer"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const item = await prisma.desiredItem.findFirstOrThrow({
      where: { rawInput: "navy wool blazer" },
    });
    createdIds.push(item.id);

    expect(item.sourceType).toBe("typed");
    expect(item.itemName).toBe("navy wool blazer");
    expect(item.userConfirmed).toBe(false);
    expect(item.pauseStatus).toBe("pending_confirmation");
  });

  it("rejects a request with no text", async () => {
    const response = await POST(buildRequest(""));
    expect(response.status).toBe(400);
  });
});
