import { describe, expect, it, vi } from "vitest";
import { pickBestImage, readImageSize } from "./imageCheck";

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function gif(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(13);
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const view = new DataView(bytes.buffer);
  view.setUint16(6, width, true);
  view.setUint16(8, height, true);
  return bytes;
}

function jpeg(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(64);
  // SOI, an APP0 segment (length 16), then a baseline start-of-frame.
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  bytes.set([0xff, 0xc0, 0x00, 0x11, 0x08], 20);
  const view = new DataView(bytes.buffer);
  view.setUint16(25, height);
  view.setUint16(27, width);
  return bytes;
}

function webpVp8x(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58]);
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff, h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 24);
  return bytes;
}

describe("readImageSize", () => {
  it("reads PNG, GIF, JPEG and WebP dimensions from the file head", () => {
    expect(readImageSize(png(800, 1200))).toEqual({ width: 800, height: 1200 });
    expect(readImageSize(gif(640, 480))).toEqual({ width: 640, height: 480 });
    expect(readImageSize(jpeg(1000, 1500))).toEqual({ width: 1000, height: 1500 });
    expect(readImageSize(webpVp8x(900, 1100))).toEqual({ width: 900, height: 1100 });
  });

  it("returns null for unknown or truncated data", () => {
    expect(readImageSize(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(readImageSize(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});

function imageResponse(bytes: Uint8Array, contentType = "image/jpeg", status = 206) {
  return new Response(bytes as BodyInit, { status, headers: { "content-type": contentType } });
}

describe("pickBestImage", () => {
  it("returns the largest image that is big enough, skipping thumbnails", async () => {
    const bodies: Record<string, Response> = {
      "https://cdn.example/thumb.jpg": imageResponse(jpeg(120, 150)),
      "https://cdn.example/medium.png": imageResponse(png(500, 700), "image/png"),
      "https://cdn.example/large.jpg": imageResponse(jpeg(1200, 1600)),
    };
    const fetchMock = vi.fn(async (url: string | URL | Request) => bodies[String(url)]) as unknown as typeof fetch;

    const best = await pickBestImage(Object.keys(bodies), fetchMock);

    expect(best).toBe("https://cdn.example/large.jpg");
  });

  it("rejects non-images, SVG logos and failed requests", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("page.html")) return imageResponse(new Uint8Array([60, 104]), "text/html", 200);
      if (u.endsWith("logo.svg")) return imageResponse(new Uint8Array([60, 115]), "image/svg+xml", 200);
      if (u.endsWith("missing.jpg")) return new Response("", { status: 404 });
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const best = await pickBestImage(
      [
        "https://cdn.example/page.html",
        "https://cdn.example/logo.svg",
        "https://cdn.example/missing.jpg",
        "https://cdn.example/blocked.jpg",
      ],
      fetchMock
    );

    expect(best).toBeNull();
  });

  it("accepts an image whose size cannot be read, but prefers one known to be big enough", async () => {
    const unknownOnly = vi.fn(async () => imageResponse(new Uint8Array(40), "image/avif")) as unknown as typeof fetch;
    expect(await pickBestImage(["https://cdn.example/a.avif"], unknownOnly)).toBe("https://cdn.example/a.avif");

    const bodies: Record<string, Response> = {
      "https://cdn.example/unknown.avif": imageResponse(new Uint8Array(40), "image/avif"),
      "https://cdn.example/known.jpg": imageResponse(jpeg(800, 800)),
    };
    const mixed = vi.fn(async (url: string | URL | Request) => bodies[String(url)]) as unknown as typeof fetch;
    expect(await pickBestImage(Object.keys(bodies), mixed)).toBe("https://cdn.example/known.jpg");
  });

  it("returns null for an empty list", async () => {
    expect(await pickBestImage([], vi.fn() as unknown as typeof fetch)).toBeNull();
  });
});
