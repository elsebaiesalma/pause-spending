import { prisma } from "@/lib/prisma";
import type { DesiredItem } from "@prisma/client";
import { getConsideringMeta } from "./consideringMeta";

export type LetGoRow = {
  item: DesiredItem;
  automatic: boolean;
};

// The same criteria src/lib/dashboard/kept.ts's total uses (dropped,
// confirmed, priced) - so this list's length always matches that total; an
// item let go without ever confirming a price simply isn't counted as
// "kept" anywhere, on this page or the dashboard.
export async function listLetGoItems(userId: string): Promise<LetGoRow[]> {
  const items = await prisma.desiredItem.findMany({
    where: { userId, decisionOutcome: "dropped", userConfirmed: true, price: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  const meta = await getConsideringMeta(items.map((item) => item.id));

  return items.map((item) => ({
    item,
    automatic: meta[item.id]?.letGoAutomatically ?? false,
  }));
}
