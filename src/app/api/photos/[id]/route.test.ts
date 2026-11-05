import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import { isPhotoStorageAvailable, savePhoto } from "@/lib/photos/photoStore";
import { GET } from "./route";

const SLOW = 60_000;

function call(id: string) {
  return GET(new NextRequest(`http://localhost:3000/api/photos/${id}`), { params: Promise.resolve({ id }) });
}

describe("GET /api/photos/[id]", () => {
  let available = false;
  let fixture: TwoTenantFixture | undefined;

  beforeAll(async () => {
    available = await isPhotoStorageAvailable();
  });

  afterEach(async () => {
    vi.mocked(auth).mockReset();
    await fixture?.cleanup();
    fixture = undefined;
  });

  it("returns 401 with no session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    expect((await call("00000000-0000-0000-0000-000000000000")).status).toBe(401);
  });

  it("returns 404 for an id that is not a UUID", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "00000000-0000-0000-0000-000000000000" } } as never);
    expect((await call("not-a-uuid")).status).toBe(404);
  });

  it(
    "serves a person's own photo, and returns 404 to anyone else",
    async (ctx) => {
      if (!available) return ctx.skip();
      fixture = await createTwoTenantFixture();
      const { userA, userB } = fixture;
      const png = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#000" } }).png().toBuffer();
      const saved = await savePhoto(userA.user.id, new File([new Uint8Array(png)], "a.png", { type: "image/png" }));
      if (!saved.ok) throw new Error("save failed");
      const id = saved.url.replace("/api/photos/", "");

      vi.mocked(auth).mockResolvedValueOnce({ user: { id: userA.user.id } } as never);
      const mine = await call(id);
      expect(mine.status).toBe(200);
      expect(mine.headers.get("content-type")).toBe("image/jpeg");
      expect(mine.headers.get("cache-control")).toContain("private");

      vi.mocked(auth).mockResolvedValueOnce({ user: { id: userB.user.id } } as never);
      expect((await call(id)).status).toBe(404);
    },
    SLOW
  );
});
