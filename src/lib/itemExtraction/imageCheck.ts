// Checks candidate product photos before one is chosen. A page can offer
// several images, and the first is often a banner, a logo or a thumbnail.
// This looks at each candidate's real content type and pixel size, then
// returns the biggest acceptable one. Everything here is optional: any
// failure (timeout, blocked, odd format) just means the caller keeps the
// candidate it already had.

const CHECK_TIMEOUT_MS = 3000;
const MAX_CANDIDATES_CHECKED = 4;
const HEAD_BYTES = 64 * 1024;
export const MIN_SHORT_SIDE = 400;

export type ImageSize = { width: number; height: number };

// Reads the width and height from the first bytes of a PNG, GIF, JPEG or
// WebP file. Returns null when the format or size can't be determined.
export function readImageSize(bytes: Uint8Array): ImageSize | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const at = (i: number) => (i < bytes.length ? bytes[i] : -1);

  // PNG: signature, then IHDR holds width and height as 32-bit numbers.
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  // GIF: "GIF8", then 16-bit little-endian width and height.
  if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && bytes.length >= 10) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }

  // JPEG: walk the segments until a start-of-frame marker.
  if (at(0) === 0xff && at(1) === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker === 0xff) {
        i += 1;
        continue;
      }
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      i += 2 + view.getUint16(i + 2);
    }
    return null;
  }

  // WebP: "RIFF....WEBP", then a VP8, VP8L or VP8X chunk.
  if (at(0) === 0x52 && at(1) === 0x49 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) {
    const chunk = String.fromCharCode(at(12), at(13), at(14), at(15));
    if (chunk === "VP8X" && bytes.length >= 30) {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width, height };
    }
    if (chunk === "VP8L" && bytes.length >= 25) {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8 " && bytes.length >= 30) {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
  }

  return null;
}

async function readHead(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer()).slice(0, HEAD_BYTES);

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < HEAD_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.length;
  }
  void reader.cancel().catch(() => undefined);

  const out = new Uint8Array(Math.min(total, HEAD_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= out.length) break;
    out.set(chunk.subarray(0, out.length - offset), offset);
    offset += chunk.length;
  }
  return out;
}

type Checked = { url: string; area: number; known: boolean };

async function checkOne(url: string, fetchImpl: typeof fetch): Promise<Checked | null> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        Range: `bytes=0-${HEAD_BYTES - 1}`,
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const type = response.headers.get("content-type")?.toLowerCase() ?? "";
    // SVGs are logos and icons; anything else that isn't an image is a
    // blocked or broken link.
    if (type && (!type.startsWith("image/") || type.includes("svg"))) return null;

    const size = readImageSize(await readHead(response));
    if (!size) return { url, area: 0, known: false };
    if (Math.min(size.width, size.height) < MIN_SHORT_SIDE) return null;
    return { url, area: size.width * size.height, known: true };
  } catch {
    return null;
  }
}

// Picks the best photo from a short list of candidates. The biggest image
// that is at least MIN_SHORT_SIDE on its short side wins. An image whose
// size can't be read is still acceptable, but ranks below any whose size is
// known to be fine. Returns null when none is acceptable.
export async function pickBestImage(
  candidates: string[],
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  const subset = candidates.slice(0, MAX_CANDIDATES_CHECKED);
  const results = await Promise.all(subset.map((url) => checkOne(url, fetchImpl)));
  const ok = results.filter((r): r is Checked => r !== null);
  if (ok.length === 0) return null;

  const known = ok.filter((r) => r.known);
  if (known.length > 0) {
    return known.reduce((best, r) => (r.area > best.area ? r : best)).url;
  }
  return ok[0].url;
}
