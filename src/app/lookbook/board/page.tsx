import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { toWardrobeEntry } from "@/lib/wardrobeEntries";
import { getLook } from "@/lib/looks/looks";
import { arrangeOutfit } from "@/lib/looks/arrange";
import { nextLookName } from "@/lib/looks/placements";
import { safeReturnPath } from "@/lib/looks/returnPath";
import { getBoardSuggestion, type BoardSuggestion } from "@/lib/stillWantIt/outfits";
import { Board, type BoardItem } from "./Board";

const SUGGESTION_TIMEOUT_MS = 12_000;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function suggestionWithTimeout(userId: string, desiredItemId: string | null): Promise<BoardSuggestion> {
  const timeout = new Promise<BoardSuggestion>((resolve) =>
    setTimeout(() => resolve({ status: "unavailable" }), SUGGESTION_TIMEOUT_MS)
  );
  return Promise.race([getBoardSuggestion(userId, desiredItemId), timeout]).catch(() => ({ status: "unavailable" }));
}

const NOTICES: Record<string, string> = {
  too_small: "Not enough pieces yet for a suggestion. Add some from your wardrobe.",
  unavailable: "A suggestion couldn't load just now. Here is a blank board.",
  none: "No suggestion this time. Here is a blank board.",
};

// The board opens in one of four ways: editing a saved look (?look=), built
// for a wanted item (?for=), blank (?blank=1), or pre-filled with a suggested
// outfit (the default). ?returnTo= is where Close and Save go afterwards.
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
    where: { userId, status: { not: "returned" } },
    include: { sourcePurchase: { select: { merchant: true, price: true } } },
  });
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

  if (lookId) {
    const look = await getLook(userId, lookId);
    if (!look) notFound();
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
        notice={null}
      />
    );
  }

  let builtInstead: string | null = null;
  if (forId) {
    const wanted = await prisma.desiredItem.findFirst({ where: { id: forId, userId }, select: { itemName: true } });
    if (!wanted) notFound();
    builtInstead = wanted.itemName?.trim() || null;
  }

  let initialPieces: ReturnType<typeof arrangeOutfit> = [];
  let notice: string | null = null;
  if (!blank) {
    const suggestion = await suggestionWithTimeout(userId, forId ?? null);
    if (suggestion.status === "ok") {
      const byId = new Map(entries.map((entry) => [entry.id, entry]));
      initialPieces = arrangeOutfit(
        suggestion.itemIds.flatMap((id) => {
          const entry = byId.get(id);
          return entry ? [{ id, category: entry.category }] : [];
        })
      );
    } else {
      notice = NOTICES[suggestion.status] ?? null;
    }
  }

  return (
    <Board
      lookId={null}
      initialName=""
      namePlaceholder={namePlaceholder}
      initialPieces={initialPieces}
      inspiredByDesiredItemId={forId ?? null}
      builtInstead={builtInstead}
      items={items}
      returnTo={returnTo}
      notice={notice}
    />
  );
}
