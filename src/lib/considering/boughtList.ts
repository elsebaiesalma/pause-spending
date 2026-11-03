import { prisma } from "@/lib/prisma";
import type { DesiredItem } from "@prisma/client";

// The Decisions page's Bought tab: items the person chose to buy ("Buy
// anyway", "I bought this after all", or "Yes" after a store visit). A store
// visit answered "Not sure yet" stays in Undecided instead. Written out as an
// OR because NOT (answer = 'not_sure') would also drop rows with no answer.
export async function listBoughtItems(userId: string): Promise<DesiredItem[]> {
  return prisma.desiredItem.findMany({
    where: {
      userId,
      pauseStatus: "proceeded",
      decisionOutcome: "proceeded",
      OR: [{ storeVisitAnswer: null }, { storeVisitAnswer: { not: "not_sure" } }],
    },
    orderBy: { createdAt: "desc" },
  });
}
