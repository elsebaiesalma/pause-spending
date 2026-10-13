import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { devWardrobeWhere } from "@/lib/devWardrobeView";
import { requireUserIdOrRedirect } from "@/lib/session";
import { toWardrobeEntry } from "@/lib/wardrobeEntries";
import { getLook } from "@/lib/looks/looks";
import { arrangeOutfit } from "@/lib/looks/arrange";
import { nextLookName } from "@/lib/looks/placements";
import { safeReturnPath } from "@/lib/looks/returnPath";
import { SUGGESTION_TIMEOUT_MS, type SuggestionResult } from "@/lib/looks/suggestion";
import { getBoardSuggestion } from "@/lib/stillWantIt/outfits";
import { Board, type BoardItem } from "./Board";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Works out a suggested outfit without holding the page up: the board opens at
// once and receives this later. Gives up after SUGGESTION_TIMEOUT_MS. It never
// rejects, so an unread promise can never become an unhandled error.
function buildSuggestion(
  userId: string,
  desiredItemId: string | null,
  entries: { id: string; category: string | null }[]
): Promise<SuggestionResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<SuggestionResult>((resolve) => {
    timer = setTimeout(() => resolve({ status: "unavailable" }), SUGGESTION_TIMEOUT_MS);
  });

  const work = getBoardSuggestion(userId, desiredItemId).then((suggestion): SuggestionResult => {
    if (suggestion.status !== "ok") return { status: suggestion.status };
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const pieces = arrangeOutfit(
      suggestion.itemIds.flatMap((id) => {
        const entry = byId.get(id);
        return entry ? [{ id, category: entry.category }] : [];
      })
    );
    return pieces.length > 0 ? { status: "ok", pieces } : { status: "none" };
  });

  return Promise.race([work, timeout])
    .catch((): SuggestionResult => ({ status: "unavailable" }))
    .finally(() => clearTimeout(timer));
}

// The board opens in one of four ways: editing a saved look (?look=), built
// for a wanted item (?for=), blank (?blank=1), or with a suggested outfit (the
// default), which is worked out in the background and placed if it arrives
// before anything is touched. ?returnTo= is where Close and Save go afterwards.
export default async function BoardPage({ searchParams }: PageProps<"/lookbook/board">) {
  const userId = await requireUserIdOrRedirect();
  const params = await searchParams;
  const lookId = firstParam(params.look);
  const forId = firstParam(params.for);
  const blank = firstParam(params.blank) === "1";
  const returnTo = safeReturnPath(firstParam(params.returnTo));

  // A wanted item that already has a look goes straight to that look.
  if (forId && !lookId) {
    const existing = await prisma.look.findFirst({
      where: { userId, inspiredByDesiredItemId: forId, items: { some: {} } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) {
      redirect(`/lookbook/board?look=${existing.id}&returnTo=${encodeURIComponent(returnTo)}`);
    }
  }

  const rows = await prisma.wardrobeItem.findMany({
    where: { userId, status: { not: "returned" }, ...devWardrobeWhere() },
    include: { sourcePurchase: { select: { merchant: true, price: true } } },
  });
  const look = lookId ? await getLook(userId, lookId) : null;
  if (lookId && !look) notFound();

  // A saved look keeps all of its pieces even if the dev view hides some of them.
  const shown = new Set(rows.map((row) => row.id));
  const hiddenPieceIds = (look?.pieces ?? []).map((piece) => piece.wardrobeItemId).filter((id) => !shown.has(id));
  if (hiddenPieceIds.length > 0) {
    rows.push(
      ...(await prisma.wardrobeItem.findMany({
        where: { userId, id: { in: hiddenPieceIds }, status: { not: "returned" } },
        include: { sourcePurchase: { select: { merchant: true, price: true } } },
      }))
    );
  }
  const entries = rows.map(toWardrobeEntry);
  const items: BoardItem[] = entries.map((entry) => ({
    id: entry.id,
    name: entry.displayName,
    brand: entry.brand,
    imageUrl: entry.imageUrl,
    category: entry.category,
    categoryKey: entry.categoryKey,
  }));
  const present = new Set(items.map((item) => item.id));

  const existingNames = (await prisma.look.findMany({ where: { userId }, select: { name: true } })).map((l) => l.name);
  const namePlaceholder = nextLookName(existingNames);

  if (look) {
    return (
      <Board
        lookId={look.id}
        initialName={look.name}
        namePlaceholder={namePlaceholder}
        initialPieces={look.pieces
          .filter((piece) => present.has(piece.wardrobeItemId))
          .map(({ wardrobeItemId, x, y, scale, zOrder }) => ({ wardrobeItemId, x, y, scale, zOrder }))}
        inspiredByDesiredItemId={look.inspiredByDesiredItemId}
        builtInstead={look.builtInstead}
        items={items}
        returnTo={returnTo}
        suggestion={null}
      />
    );
  }

  let builtInstead: string | null = null;
  if (forId) {
    const wanted = await prisma.desiredItem.findFirst({ where: { id: forId, userId }, select: { itemName: true } });
    if (!wanted) notFound();
    builtInstead = wanted.itemName?.trim() || null;
  }

  const suggestion = blank ? null : buildSuggestion(userId, forId ?? null, entries);

  return (
    <Board
      lookId={null}
      initialName=""
      namePlaceholder={namePlaceholder}
      initialPieces={[]}
      inspiredByDesiredItemId={forId ?? null}
      builtInstead={builtInstead}
      items={items}
      returnTo={returnTo}
      suggestion={suggestion}
    />
  );
}
