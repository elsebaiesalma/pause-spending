import { afterEach, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { createTwoTenantFixture, type TwoTenantFixture } from "@/lib/testHelpers/twoTenantFixture";
import {
  MAX_PHOTO_BYTES,
  deletePhotoByUrl,
  isPhotoStorageAvailable,
  photoChangeFromForm,
  readPhoto,
  savePhoto,
  shrinkPhoto,
} from "./photoStore";

async function bigPng(width = 2400, height = 3000) {
  return sharp({ create: { width, height, channels: 3, background: "#8e4752" } }).png().toBuffer();
}

async function pngFile(width?: number, height?: number) {
  return new File([new Uint8Array(await bigPng(width, height))], "tee.png", { type: "image/png" });
}

const SLOW = 60_000;

describe("shrinkPhoto", () => {
  it("fits a large photo inside 1000 x 1250 and returns a JPEG", async () => {
    const out = await shrinkPhoto(await bigPng());
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBeLessThanOrEqual(1000);
    expect(meta.height).toBeLessThanOrEqual(1250);
  });

  it("does not enlarge a small photo", async () => {
    const meta = await sharp(await shrinkPhoto(await bigPng(200, 250))).metadata();
    expect(meta.width).toBe(200);
  });

  it("throws on bytes that are not an image", async () => {
    await expect(shrinkPhoto(Buffer.from("not an image"))).rejects.toThrow();
  });
});

describe("photo storage", () => {
  let available = false;
  let fixture: TwoTenantFixture | undefined;

  beforeAll(async () => {
    available = await isPhotoStorageAvailable();
  });

  afterEach(async () => {
    await fixture?.cleanup();
    fixture = undefined;
  });

  it(
    "saves a photo for one person, who can read it back, and nobody else can",
    async (ctx) => {
      if (!available) return ctx.skip();
      fixture = await createTenant();
      const { userA, userB } = fixture;

      const saved = await savePhoto(userA.user.id, await pngFile());
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;
      const id = saved.url.replace("/api/photos/", "");

      const mine = await readPhoto(userA.user.id, id);
      expect(mine?.contentType).toBe("image/jpeg");
      expect((await sharp(mine!.data).metadata()).width).toBeLessThanOrEqual(1000);
      expect(await readPhoto(userB.user.id, id)).toBeNull();
    },
    SLOW
  );

  it(
    "refuses a file over the size limit and one that is not an image",
    async (ctx) => {
      if (!available) return ctx.skip();
      fixture = await createTenant();
      const { userA } = fixture;

      const tooBig = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "huge.jpg", { type: "image/jpeg" });
      expect(await savePhoto(userA.user.id, tooBig)).toEqual({ ok: false, reason: "too_large" });
      const text = new File(["hello"], "note.png", { type: "image/png" });
      expect(await savePhoto(userA.user.id, text)).toEqual({ ok: false, reason: "not_an_image" });
    },
    SLOW
  );

  it(
    "deletes only the person's own stored photo, and ignores other kinds of link",
    async (ctx) => {
      if (!available) return ctx.skip();
      fixture = await createTenant();
      const { userA, userB } = fixture;
      const saved = await savePhoto(userA.user.id, await pngFile(300, 400));
      if (!saved.ok) throw new Error("save failed");
      const id = saved.url.replace("/api/photos/", "");

      await deletePhotoByUrl(userB.user.id, saved.url);
      expect(await readPhoto(userA.user.id, id)).not.toBeNull();
      await deletePhotoByUrl(userA.user.id, "https://example.com/tee.jpg");
      await deletePhotoByUrl(userA.user.id, null);
      expect(await readPhoto(userA.user.id, id)).not.toBeNull();
      await deletePhotoByUrl(userA.user.id, saved.url);
      expect(await readPhoto(userA.user.id, id)).toBeNull();
    },
    SLOW
  );

  it(
    "reads a form as set, remove, none or error",
    async (ctx) => {
      if (!available) return ctx.skip();
      fixture = await createTenant();
      const { userA } = fixture;

      const none = new FormData();
      expect(await photoChangeFromForm(userA.user.id, none)).toEqual({ change: "none" });

      const remove = new FormData();
      remove.set("removePhoto", "1");
      expect(await photoChangeFromForm(userA.user.id, remove)).toEqual({ change: "remove" });

      const set = new FormData();
      set.set("photo", await pngFile(300, 400));
      const result = await photoChangeFromForm(userA.user.id, set);
      expect(result.change).toBe("set");

      const bad = new FormData();
      bad.set("photo", new File(["x"], "x.png", { type: "image/png" }));
      expect((await photoChangeFromForm(userA.user.id, bad)).change).toBe("error");
    },
    SLOW
  );

  it("ignores an empty file input, so a form with no photo chosen saves normally", async () => {
    const form = new FormData();
    form.set("photo", new File([], "", { type: "application/octet-stream" }));
    expect(await photoChangeFromForm("00000000-0000-0000-0000-000000000000", form)).toEqual({ change: "none" });
  });

  async function createTenant() {
    const f = await createTwoTenantFixture();
    return f;
  }
});

