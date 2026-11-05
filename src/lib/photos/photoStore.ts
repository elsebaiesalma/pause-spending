import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

// Photos live in the `photos` table (prisma/manual/photos.sql), read and
// written with raw SQL until that table is confirmed on both Neon branches.
// Every query is scoped by user id.

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // under a serverless request body limit
const MAX_WIDTH = 1000;
const MAX_HEIGHT = 1250;
const PHOTO_PATH = /^\/api\/photos\/([0-9a-f-]{36})$/;

export type PhotoResult = { ok: true; url: string } | { ok: false; reason: "too_large" | "not_an_image" };

export async function isPhotoStorageAvailable(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ present: boolean }[]>`
      SELECT to_regclass('public.photos') IS NOT NULL AS present
    `;
    return rows[0]?.present === true;
  } catch (error) {
    console.error("[photos] could not check for the photos table:", error);
    return false;
  }
}

// Straightens the photo (EXIF rotation), shrinks it to fit inside the largest
// size a card ever shows, and re-encodes it as JPEG on white. Throws on bytes
// that are not an image.
export async function shrinkPhoto(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

export async function savePhoto(userId: string, file: File): Promise<PhotoResult> {
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, reason: "too_large" };
  let data: Buffer;
  try {
    data = await shrinkPhoto(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { ok: false, reason: "not_an_image" };
  }
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO photos (id, user_id, content_type, data)
    VALUES (${id}::uuid, ${userId}::uuid, 'image/jpeg', ${data})
  `;
  return { ok: true, url: `/api/photos/${id}` };
}

export async function readPhoto(userId: string, id: string): Promise<{ contentType: string; data: Buffer } | null> {
  const rows = await prisma.$queryRaw<{ content_type: string; data: Buffer }[]>`
    SELECT content_type, data FROM photos WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
  `;
  const row = rows[0];
  return row ? { contentType: row.content_type, data: Buffer.from(row.data) } : null;
}

// Deletes the stored photo behind an item's image path, if it is one of ours
// and belongs to this person. Other URLs (a link from a store, a mock image)
// are left alone.
export async function deletePhotoByUrl(userId: string, imageUrl: string | null | undefined): Promise<void> {
  const match = imageUrl ? PHOTO_PATH.exec(imageUrl) : null;
  if (!match) return;
  await prisma.$executeRaw`DELETE FROM photos WHERE id = ${match[1]}::uuid AND user_id = ${userId}::uuid`;
}

export const PHOTO_ERROR_MESSAGES = {
  too_large: "That photo is too large. Choose one under 4 MB.",
  not_an_image: "That file isn't a photo we can read. Try a JPEG or PNG.",
} as const;

export type PhotoChange =
  | { change: "none" }
  | { change: "set"; url: string }
  | { change: "remove" }
  | { change: "error"; message: string };

// What a form that posted a "photo" file (and maybe "removePhoto") asks for.
// A file sent while photo storage does not exist yet is ignored, never an
// error, so the rest of the form still saves.
export async function photoChangeFromForm(userId: string, form: FormData): Promise<PhotoChange> {
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!(await isPhotoStorageAvailable())) return { change: "none" };
    const saved = await savePhoto(userId, file);
    return saved.ok ? { change: "set", url: saved.url } : { change: "error", message: PHOTO_ERROR_MESSAGES[saved.reason] };
  }
  return form.get("removePhoto")?.toString() === "1" ? { change: "remove" } : { change: "none" };
}
