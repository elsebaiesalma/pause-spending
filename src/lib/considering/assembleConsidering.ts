import { prisma } from "@/lib/prisma";
import type { DesiredItem } from "@prisma/client";
import { listWaitingQueue } from "@/lib/waitQueue";
import { getReflectionAnswer } from "@/lib/pauseScreen/reflection";
import { getKeptSummary } from "@/lib/dashboard/kept";
import { getConsideringMeta, sweepStaleSavedItems, SAVED_RETENTION_DAYS } from "./consideringMeta";

export type OnPauseRow = {
  item: DesiredItem;
  pausedAt: Date;
  reflectionSummary: string | null;
};

export type SavedRow = {
  item: DesiredItem;
  savedDaysAgo: number;
};

export type LetGoTotals = {
  itemsLetGo: number;
  totalKept: number;
};

export type ConsideringPayload = {
  onPause: OnPauseRow[];
  saved: SavedRow[];
  letGo: LetGoTotals;
};

function buildReflectionSummary(
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
  await sweepStaleSavedItems(userId, now);

  const [waitingQueue, savedItems] = await Promise.all([
    listWaitingQueue(userId, now),
    prisma.desiredItem.findMany({ where: { userId, pauseStatus: "saved_for_later" }, orderBy: { createdAt: "desc" } }),
  ]);

  const onPauseItems = [...waitingQueue.elapsed, ...waitingQueue.stillWaiting];
  const meta = await getConsideringMeta([...onPauseItems.map((i) => i.id), ...savedItems.map((i) => i.id)]);

  const reflections = await Promise.all(onPauseItems.map((item) => getReflectionAnswer(item.id, userId)));

  const replacedIds = Array.from(
    new Set(reflections.filter((r) => r?.replacesWardrobeItemId).map((r) => r!.replacesWardrobeItemId as string))
  );
  const replacedItems = replacedIds.length
    ? await prisma.wardrobeItem.findMany({ where: { id: { in: replacedIds } }, select: { id: true, itemName: true } })
    : [];
  const replacedNameById = new Map(replacedItems.map((w) => [w.id, w.itemName]));

  const onPause: OnPauseRow[] = onPauseItems.map((item, index) => {
    const reflection = reflections[index];
    const replacedName = reflection?.replacesWardrobeItemId
      ? (replacedNameById.get(reflection.replacesWardrobeItemId) ?? null)
      : null;
    return {
      item,
      pausedAt: meta[item.id]?.pausedAt ?? item.createdAt,
      reflectionSummary: buildReflectionSummary(reflection, replacedName),
    };
  });

  const saved: SavedRow[] = savedItems.map((item) => {
    const savedAt = meta[item.id]?.savedAt ?? item.createdAt;
    const savedDaysAgo = Math.max(0, Math.floor((now.getTime() - savedAt.getTime()) / 86_400_000));
    return { item, savedDaysAgo };
  });

  const letGoSummary = await getKeptSummary(userId, "all_time", now);

  return {
    onPause,
    saved,
    letGo: { itemsLetGo: letGoSummary.itemsLetGo, totalKept: letGoSummary.totalKept },
  };
}

export { SAVED_RETENTION_DAYS };
