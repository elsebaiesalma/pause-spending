import { prisma } from "@/lib/prisma";
import type { DesiredItem } from "@prisma/client";
import { listWaitingQueue } from "@/lib/waitQueue";
import { getReflectionAnswer } from "@/lib/pauseScreen/reflection";
import { getKeptSummary } from "@/lib/dashboard/kept";
import {
  getConsideringMeta,
  getPauseEndedAt,
  sweepEndedPauses,
  sweepStaleSavedItems,
  SAVED_RETENTION_DAYS,
} from "./consideringMeta";
import { listUndecidedVisits } from "@/lib/stillWantIt/storeVisit";

export type OnPauseRow = {
  item: DesiredItem;
  pausedAt: Date;
  reflectionSummary: string | null;
};

export type UndecidedRow = {
  item: DesiredItem;
  wentToStoreAt: Date;
};

export type SavedRow = {
  item: DesiredItem;
  savedDaysAgo: number;
  // Set when the item is here because its pause ended ("Pause ended Oct 14").
  pauseEndedAt: Date | null;
  reflectionSummary: string | null;
};

export type LetGoTotals = {
  itemsLetGo: number;
  totalKept: number;
};

export type ConsideringPayload = {
  onPause: OnPauseRow[];
  undecided: UndecidedRow[];
  saved: SavedRow[];
  letGo: LetGoTotals;
};

export function buildReflectionSummary(
  reflection: { needScore: number | null; replacesWardrobeItemId: string | null; replacesNothing: boolean } | null,
  replacedItemName: string | null
): string | null {
  if (!reflection) return null;

  const parts: string[] = [];
  if (reflection.needScore !== null) parts.push(`need ${reflection.needScore}/7`);
  if (reflection.replacesNothing) parts.push("would replace nothing - it's new");
  else if (replacedItemName) parts.push(`would replace ${replacedItemName}`);

  return parts.length > 0 ? `You said: ${parts.join(" · ")}` : null;
}

// Assembles everything the Considering tab (src/app/considering/page.tsx)
// needs: items currently on pause (with their paused-since date and saved
// reflection recap), items saved for later (with how long ago), and the
// let-go totals. Sweeps stale saved-for-later items to "let go" first (see
// consideringMeta.ts) - the same "checked fresh on every load, no
// background job" pattern src/lib/waitQueue.ts already uses for the wait
// timer - so a page load never shows an item as still saved past its
// retention window.
export async function assembleConsidering(userId: string, now: Date = new Date()): Promise<ConsideringPayload> {
  // Ended pauses first (silently, no notice), so their 60-day clock is
  // already running when the stale sweep looks at them.
  await sweepEndedPauses(userId, now);
  await sweepStaleSavedItems(userId, now);

  const [waitingQueue, savedItems] = await Promise.all([
    listWaitingQueue(userId, now),
    prisma.desiredItem.findMany({ where: { userId, pauseStatus: "saved_for_later" }, orderBy: { createdAt: "desc" } }),
  ]);

  const onPauseItems = [...waitingQueue.elapsed, ...waitingQueue.stillWaiting];
  const allIds = [...onPauseItems.map((i) => i.id), ...savedItems.map((i) => i.id)];
  const [meta, pauseEnded] = await Promise.all([getConsideringMeta(allIds), getPauseEndedAt(savedItems.map((i) => i.id))]);

  // Reflection answers stay attached to an item as it moves between sections.
  const reflectionItems = [...onPauseItems, ...savedItems];
  const reflections = await Promise.all(reflectionItems.map((item) => getReflectionAnswer(item.id, userId)));

  const replacedIds = Array.from(
    new Set(reflections.filter((r) => r?.replacesWardrobeItemId).map((r) => r!.replacesWardrobeItemId as string))
  );
  const replacedItems = replacedIds.length
    ? await prisma.wardrobeItem.findMany({ where: { id: { in: replacedIds } }, select: { id: true, itemName: true } })
    : [];
  const replacedNameById = new Map(replacedItems.map((w) => [w.id, w.itemName]));

  const summaryAt = (index: number): string | null => {
    const reflection = reflections[index];
    const replacedName = reflection?.replacesWardrobeItemId
      ? (replacedNameById.get(reflection.replacesWardrobeItemId) ?? null)
      : null;
    return buildReflectionSummary(reflection, replacedName);
  };

  const onPause: OnPauseRow[] = onPauseItems.map((item, index) => ({
    item,
    pausedAt: meta[item.id]?.pausedAt ?? item.createdAt,
    reflectionSummary: summaryAt(index),
  }));

  const saved: SavedRow[] = savedItems.map((item, index) => {
    const savedAt = meta[item.id]?.savedAt ?? item.createdAt;
    const savedDaysAgo = Math.max(0, Math.floor((now.getTime() - savedAt.getTime()) / 86_400_000));
    return { item, savedDaysAgo, pauseEndedAt: pauseEnded[item.id] ?? null, reflectionSummary: summaryAt(onPauseItems.length + index) };
  });

  const undecidedVisits = await listUndecidedVisits(userId);
  const undecidedItems = undecidedVisits.length
    ? await prisma.desiredItem.findMany({
        where: { userId, id: { in: undecidedVisits.map((v) => v.id) } },
      })
    : [];
  const undecidedById = new Map(undecidedItems.map((item) => [item.id, item]));
  const undecided: UndecidedRow[] = undecidedVisits.flatMap((visit) => {
    const item = undecidedById.get(visit.id);
    return item ? [{ item, wentToStoreAt: visit.wentToStoreAt }] : [];
  });

  const letGoSummary = await getKeptSummary(userId, "all_time", now);

  return {
    onPause,
    undecided,
    saved,
    letGo: { itemsLetGo: letGoSummary.itemsLetGo, totalKept: letGoSummary.totalKept },
  };
}

export { SAVED_RETENTION_DAYS };
