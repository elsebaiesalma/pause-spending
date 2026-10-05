import type { WardrobeItem } from "@prisma/client";
import type { SimilarityProbe } from "@/lib/tagging/similarity";

// A short, honest reason for why one already-owned item was shortlisted -
// only ever names attributes that actually overlap (never a fabricated or
// invented one), in the same spirit as generateRedundancyExplanation's own
// "never invent an attribute" rule. This is deliberately not a similarity
// score - see BACKLOG.md's parked "similarity heatmap" note for why a
// precise number would overstate what this rule-based matching can justify.
export function matchReason(
  probe: SimilarityProbe,
  item: Pick<WardrobeItem, "category" | "colorFamily" | "styleTags">
): string {
  const parts: string[] = [];
  if (probe.colorFamily && item.colorFamily === probe.colorFamily) parts.push("same color");
  if (probe.category && item.category === probe.category) parts.push("same category");
  if ((probe.styleTags ?? []).some((tag) => item.styleTags.includes(tag))) parts.push("shared style");
  return parts.length > 0 ? parts.join(" · ") : "similar item";
}
