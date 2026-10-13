import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { OUTFIT_MODEL } from "@/lib/anthropicModels";
import { getAnthropicClient } from "@/lib/anthropicClient";
import { prisma } from "@/lib/prisma";

// Below this many owned pieces, a 2-4 item outfit would mostly repeat the
// same few things, so we say so instead of guessing.
export const MIN_OWNED_PIECES = 4;
const MAX_OUTFITS = 3;
const MAX_ITEMS_PER_OUTFIT = 4;
const MIN_ITEMS_PER_OUTFIT = 2;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

// The only fields of an owned piece that ever reach the model. Names,
// brands, prices and photos stay on our side.
export type OutfitPiece = {
  id: string;
  category: string | null;
  colorFamily: string | null;
  colorName: string | null;
  tags: string[];
};

// The wanted item, described with the same fields. It is not owned, so it is
// never a valid id in an outfit; it only tells the model what to approximate.
export type OutfitTarget = Omit<OutfitPiece, "id">;

// What the model is allowed to say: which owned pieces go together. No prose.
export type ValidOutfit = { itemIds: string[] };

export type OutfitItem = {
  id: string;
  itemName: string;
  imageUrl: string | null;
  category: string | null;
  colorFamily: string | null;
};

// The visible description is built here from the chosen items' own names,
// never taken from model prose.
export type OutfitWithItems = { description: string; items: OutfitItem[] };

// "unavailable" means the model call failed or came back unparseable. It is
// deliberately separate from "too_small" and from "ok" with no outfits, so a
// broken call never looks like an empty wardrobe.
export type OutfitSuggestions =
  | { status: "too_small" }
  | { status: "unavailable" }
  | { status: "ok"; outfits: OutfitWithItems[] };

// The model returns ids and nothing else. zod strips any other key it adds,
// so prose tucked into the response is never read or shown.
const outfitResponseSchema = z.object({
  outfits: z
    .array(
      z.object({
        itemIds: z.array(z.string()).describe("Ids of 2-4 owned pieces, taken only from the list provided."),
      })
    )
    .describe("Up to 3 outfits. An empty list is acceptable if no sensible outfit is possible."),
});

const OUTFIT_SYSTEM_PROMPT = `You suggest outfits built from a person's own wardrobe, to approximate the look of an item they are considering buying.

Rules:
- Use only the owned pieces provided, referenced by their id. Never invent an id.
- Each outfit uses 2 to 4 pieces and should echo the target's role, colour and style as closely as the owned pieces allow.
- Never include the target item itself. It is not owned.
- Return only the ids. Do not write descriptions or any other text.
- Return an empty list if no sensible outfit is possible.`;

// Used when there is no wanted item: the Lookbook's "start from a suggestion".
const OPEN_SYSTEM_PROMPT = `You suggest outfits built from a person's own wardrobe.

Rules:
- Use only the owned pieces provided, referenced by their id. Never invent an id.
- Each outfit uses 2 to 4 pieces that work well together: a top or a dress, bottoms when there is no dress, and shoes or a bag when they suit it.
- Return only the ids. Do not write descriptions or any other text.
- Return an empty list if no sensible outfit is possible.`;

export function wardrobeVersion(pieces: OutfitPiece[]): string {
  const canonical = [...pieces]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => [p.id, p.category, p.colorFamily, p.colorName, [...p.tags].sort()]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

export function buildOutfitPrompt(target: OutfitTarget | null, pieces: OutfitPiece[]): string {
  if (target === null) return ["Owned pieces:", JSON.stringify(pieces)].join("\n");
  return [
    "Target item (not owned, do not include it):",
    JSON.stringify({
      category: target.category,
      colorFamily: target.colorFamily,
      colorName: target.colorName,
      tags: target.tags,
    }),
    "",
    "Owned pieces:",
    JSON.stringify(pieces),
  ].join("\n");
}

// Builds the visible description from the chosen items' names:
// "Cream top, black linen trousers and navy coat".
export function describeOutfit(names: string[]): string {
  const cleaned = names.map((name) => name.trim()).filter((name) => name.length > 0);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  return `${cleaned.slice(0, -1).join(", ")} and ${cleaned[cleaned.length - 1]}`;
}

// Validates each model outfit against the user's own owned ids. Any id not in
// `ownedIds`, any duplicate, or a size outside 2-4 drops that outfit only.
export function validateOutfits(outfits: unknown[], ownedIds: ReadonlySet<string>): ValidOutfit[] {
  const idSchema = z.uuid().refine((id) => ownedIds.has(id), { message: "not in this user's wardrobe" });
  const outfitSchema = z.object({
    itemIds: z
      .array(idSchema)
      .min(MIN_ITEMS_PER_OUTFIT)
      .max(MAX_ITEMS_PER_OUTFIT)
      .refine((ids) => new Set(ids).size === ids.length, { message: "duplicate id" }),
  });

  return outfits.slice(0, MAX_OUTFITS).flatMap((candidate) => {
    const parsed = outfitSchema.safeParse(candidate);
    return parsed.success ? [{ itemIds: parsed.data.itemIds }] : [];
  });
}

async function generateValidOutfits(target: OutfitTarget | null, pieces: OutfitPiece[]): Promise<ValidOutfit[]> {
  const response = await getAnthropicClient().messages.parse({
    model: OUTFIT_MODEL,
    max_tokens: 1024,
    system: target === null ? OPEN_SYSTEM_PROMPT : OUTFIT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildOutfitPrompt(target, pieces) }],
    output_config: { format: zodOutputFormat(outfitResponseSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Outfit response failed to parse against the expected schema");
  }

  return validateOutfits(response.parsed_output.outfits, new Set(pieces.map((p) => p.id)));
}

// Cache is per process and keyed by user, desired item and wardrobe version,
// so a change to the wardrobe is a natural miss. The key includes userId, so
// one user's entry can never be served to another. Entries hold ids only.
type CacheEntry = { outfits: ValidOutfit[]; expiresAt: number };
const globalForOutfits = globalThis as unknown as { stillWantItOutfits?: Map<string, CacheEntry> };
const outfitCache = (globalForOutfits.stillWantItOutfits ??= new Map<string, CacheEntry>());

function readCache(key: string, now: number): ValidOutfit[] | null {
  const entry = outfitCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    outfitCache.delete(key);
    return null;
  }
  return entry.outfits;
}

function writeCache(key: string, outfits: ValidOutfit[], now: number): void {
  if (outfitCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = outfitCache.keys().next().value;
    if (oldest !== undefined) outfitCache.delete(oldest);
  }
  outfitCache.set(key, { outfits, expiresAt: now + CACHE_TTL_MS });
}

// Returns null when the desired item doesn't belong to this user, so the
// caller can 404 the same way it does for any other missing item.
export async function getOutfitSuggestions(
  userId: string,
  desiredItemId: string,
  now: number = Date.now()
): Promise<OutfitSuggestions | null> {
  const desired = await prisma.desiredItem.findFirst({
    where: { id: desiredItemId, userId },
    select: { category: true, colorFamily: true, colorName: true, styleTags: true },
  });
  if (!desired) return null;

  const rows = await prisma.wardrobeItem.findMany({
    where: { userId, status: "active" },
    select: {
      id: true,
      itemName: true,
      imageUrl: true,
      category: true,
      colorFamily: true,
      colorName: true,
      styleTags: true,
      useCaseTags: true,
    },
    orderBy: { id: "asc" },
  });

  if (rows.length < MIN_OWNED_PIECES) return { status: "too_small" };

  const pieces: OutfitPiece[] = rows.map((row) => ({
    id: row.id,
    category: row.category,
    colorFamily: row.colorFamily,
    colorName: row.colorName,
    tags: Array.from(new Set([...row.styleTags, ...row.useCaseTags])),
  }));

  const key = `${userId}:${desiredItemId}:${wardrobeVersion(pieces)}`;
  let outfits = readCache(key, now);

  if (!outfits) {
    try {
      const target: OutfitTarget = {
        category: desired.category,
        colorFamily: desired.colorFamily,
        colorName: desired.colorName,
        tags: desired.styleTags,
      };
      outfits = await generateValidOutfits(target, pieces);
    } catch (error) {
      // Not cached, so the next load retries. Logged with the API status
      // where there is one, so a bad model ID or auth problem is visible.
      const status = error instanceof Anthropic.APIError ? error.status : undefined;
      console.error(
        `[still-want-it] outfit model call failed (model=${OUTFIT_MODEL}, status=${status ?? "none"}):`,
        error
      );
      return { status: "unavailable" };
    }
    writeCache(key, outfits, now);
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const withItems: OutfitWithItems[] = outfits.flatMap((outfit) => {
    const items = outfit.itemIds.flatMap((id) => {
      const row = byId.get(id);
      return row
        ? [{ id: row.id, itemName: row.itemName, imageUrl: row.imageUrl, category: row.category, colorFamily: row.colorFamily }]
        : [];
    });
    // Defensive: a cached outfit whose pieces have since left the wardrobe
    // would show fewer than 2 items, so it is dropped rather than shown.
    if (items.length < MIN_ITEMS_PER_OUTFIT) return [];
    return [{ description: describeOutfit(items.map((item) => item.itemName)), items }];
  });

  return { status: "ok", outfits: withItems };
}

// One validated outfit of owned piece ids for the Lookbook board, or a reason
// there isn't one. With a wanted item it is the same (cached) suggestion Still
// want it shows, so the board opens with what that page described; without one
// it is a general suggestion from the whole wardrobe. Ids only, and every id
// has been checked against this user's own active pieces.
export type BoardSuggestion =
  | { status: "ok"; itemIds: string[] }
  | { status: "too_small" | "unavailable" | "none" };

export async function getBoardSuggestion(
  userId: string,
  desiredItemId: string | null,
  now: number = Date.now()
): Promise<BoardSuggestion> {
  if (desiredItemId) {
    const result = await getOutfitSuggestions(userId, desiredItemId, now);
    if (!result) return { status: "none" };
    if (result.status !== "ok") return { status: result.status };
    const first = result.outfits[0];
    return first ? { status: "ok", itemIds: first.items.map((item) => item.id) } : { status: "none" };
  }

  const rows = await prisma.wardrobeItem.findMany({
    where: { userId, status: "active" },
    select: { id: true, category: true, colorFamily: true, colorName: true, styleTags: true, useCaseTags: true },
    orderBy: { id: "asc" },
  });
  if (rows.length < MIN_OWNED_PIECES) return { status: "too_small" };

  const pieces: OutfitPiece[] = rows.map((row) => ({
    id: row.id,
    category: row.category,
    colorFamily: row.colorFamily,
    colorName: row.colorName,
    tags: Array.from(new Set([...row.styleTags, ...row.useCaseTags])),
  }));

  const key = `${userId}:open:${wardrobeVersion(pieces)}`;
  let outfits = readCache(key, now);
  if (!outfits) {
    try {
      outfits = await generateValidOutfits(null, pieces);
    } catch (error) {
      const status = error instanceof Anthropic.APIError ? error.status : undefined;
      console.error(`[lookbook] outfit model call failed (model=${OUTFIT_MODEL}, status=${status ?? "none"}):`, error);
      return { status: "unavailable" };
    }
    writeCache(key, outfits, now);
  }
  const first = outfits[0];
  return first ? { status: "ok", itemIds: first.itemIds } : { status: "none" };
}

export function clearOutfitCacheForTests(): void {
  outfitCache.clear();
}
