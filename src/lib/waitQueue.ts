import { prisma } from "@/lib/prisma";
import type { DesiredItem } from "@prisma/client";

export type WaitingQueue = {
  elapsed: DesiredItem[];
  stillWaiting: DesiredItem[];
};

// Splits every desired item the user chose to wait on (Step 13's wait
// endpoint) into those whose timer has elapsed - which should prompt a
// decision - and those still counting down. Checked fresh on every app
// load (no background job, no email/push notification per the design's
// in-app-only requirement).
export async function listWaitingQueue(userId: string, now: Date = new Date()): Promise<WaitingQueue> {
  const waiting = await prisma.desiredItem.findMany({
    where: { userId, pauseStatus: "waiting" },
    orderBy: { waitUntil: "asc" },
  });

  const elapsed: DesiredItem[] = [];
  const stillWaiting: DesiredItem[] = [];
  for (const item of waiting) {
    if (item.waitUntil && item.waitUntil <= now) {
      elapsed.push(item);
    } else {
      stillWaiting.push(item);
    }
  }

  return { elapsed, stillWaiting };
}
