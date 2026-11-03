import type { DesiredItem } from "@prisma/client";

// One status per wanted item, so every item has exactly one home: a tab on
// the Decisions page and one badge everywhere it appears.
export type ItemStatus = "draft" | "deciding" | "paused" | "undecided" | "let_go" | "bought" | "still_want";

type StatusFields = Pick<DesiredItem, "userConfirmed" | "pauseStatus" | "decisionOutcome"> & {
  storeVisitAnswer?: string | null;
};

export function itemStatus(item: StatusFields): ItemStatus {
  if (!item.userConfirmed) return "draft";
  if (item.pauseStatus === "waiting") return "paused";
  if (item.pauseStatus === "saved_for_later") return "undecided";
  if (item.decisionOutcome === "dropped") return "let_go";
  if (item.decisionOutcome === "proceeded") {
    // "Not sure yet" after a store visit is still undecided.
    if (item.storeVisitAnswer === "not_sure") return "undecided";
    if (item.storeVisitAnswer === "bought") return "bought";
    // Chose "Buy anyway" (or "I bought this after all") without a store-visit answer.
    return item.storeVisitAnswer === "not_bought" ? "undecided" : "still_want";
  }
  return "deciding";
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  draft: "Not confirmed",
  deciding: "Not decided",
  paused: "Paused",
  undecided: "Undecided",
  let_go: "Let go",
  bought: "Bought",
  still_want: "Chose to buy",
};

// Badge tone classes from globals.css.
export const STATUS_BADGE: Record<ItemStatus, string> = {
  draft: "badge badge--neutral",
  deciding: "badge badge--neutral",
  paused: "badge badge--success",
  undecided: "badge",
  let_go: "badge badge--neutral",
  bought: "badge badge--dark",
  still_want: "badge",
};

export type DecisionsTab = "paused" | "undecided" | "let-go" | "bought";

export const DECISIONS_TABS: DecisionsTab[] = ["paused", "undecided", "let-go", "bought"];

export function parseDecisionsTab(value: string | string[] | undefined): DecisionsTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return DECISIONS_TABS.includes(raw as DecisionsTab) ? (raw as DecisionsTab) : "paused";
}
