import { CATEGORIES, OTHER_CATEGORY, categoryConfig } from "@/lib/wardrobeView";

// "Well stocked": the category you own the most of (ties share it), with at
// least WELL_STOCKED_MIN active pieces. That is a count, not a similarity
// claim. Near-duplicate clusters are a separate signal: they drive the
// "4 similar blue bottoms" sentence, not the badge.
//
// Near-duplicates follow the same rule findSimilarWardrobeItems uses
// for the pause screen (src/lib/tagging/similarity.ts) - same category, same
// color family, overlapping style tags - applied here in memory over a whole
// wardrobe instead of one probe. Only active items count, and an item with no
// color family never forms a cluster (unknown is never a match).
export const WELL_STOCKED_MIN = 3;

export type ClusterItem = {
  id: string;
  categoryKey: string;
  colorFamily: string | null;
  styleTags: string[];
  status: string;
};

export type Cluster = { categoryKey: string; colorFamily: string; itemIds: string[] };

export function nearDuplicates(a: ClusterItem, b: ClusterItem): boolean {
  if (a.categoryKey !== b.categoryKey) return false;
  if (!a.colorFamily || a.colorFamily !== b.colorFamily) return false;
  return a.styleTags.some((tag) => b.styleTags.includes(tag));
}

// Groups of 3+ near-duplicates. Items are linked when they are near-duplicates
// of each other, and a group is everything reachable through those links.
export function findClusters(items: readonly ClusterItem[]): Cluster[] {
  const active = items.filter((item) => item.status === "active" && item.colorFamily);
  const parent = new Map(active.map((item) => [item.id, item.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      if (nearDuplicates(active[i], active[j])) parent.set(find(active[i].id), find(active[j].id));
    }
  }

  const groups = new Map<string, ClusterItem[]>();
  for (const item of active) {
    const root = find(item.id);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  }

  return [...groups.values()]
    .filter((group) => group.length >= WELL_STOCKED_MIN)
    .map((group) => ({
      categoryKey: group[0].categoryKey,
      colorFamily: group[0].colorFamily as string,
      itemIds: group.map((item) => item.id),
    }));
}

const NOUN: Record<string, string> = {
  tops: "tops",
  knitwear: "knits",
  outerwear: "coats and jackets",
  bottoms: "bottoms",
  dresses: "dresses",
  shoes: "shoes",
  bags: "bags",
  accessories: "accessories",
  other: "pieces",
};

const COLOR_WORD: Record<string, string> = { multi: "multicolored" };

// "4 similar black tops". Specific and plain: a count, a color, a kind.
export function describeCluster(cluster: Cluster): string {
  const color = COLOR_WORD[cluster.colorFamily] ?? cluster.colorFamily;
  return `${cluster.itemIds.length} similar ${color} ${NOUN[cluster.categoryKey] ?? "pieces"}`;
}

export type ConcentrationRow = {
  key: string;
  label: string;
  count: number;
  // Item count against the largest category, 0 to 1, for the bar only. It is
  // never shown as a number.
  share: number;
  wellStocked: boolean;
  sentence: string | null;
};

// One row per category that has items, biggest first (rack order breaks ties).
// `items` is everything on the wardrobe page; clusters only look at the
// active ones inside it.
export function buildConcentration(items: readonly ClusterItem[]): ConcentrationRow[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.categoryKey, (counts.get(item.categoryKey) ?? 0) + 1);

  // The largest cluster in each category gets the sentence.
  const largest = new Map<string, Cluster>();
  for (const cluster of findClusters(items)) {
    const current = largest.get(cluster.categoryKey);
    if (!current || cluster.itemIds.length > current.itemIds.length) largest.set(cluster.categoryKey, cluster);
  }

  const max = Math.max(0, ...counts.values());
  const activeCounts = new Map<string, number>();
  for (const item of items) {
    if (item.status === "active") activeCounts.set(item.categoryKey, (activeCounts.get(item.categoryKey) ?? 0) + 1);
  }
  const activeMax = Math.max(0, ...activeCounts.values());
  const order = [...CATEGORIES, OTHER_CATEGORY];
  return order
    .filter((category) => (counts.get(category.key) ?? 0) > 0)
    .map((category) => {
      const count = counts.get(category.key) as number;
      const cluster = largest.get(category.key);
      return {
        key: category.key,
        label: categoryConfig(category.key).label,
        count,
        share: max === 0 ? 0 : count / max,
        wellStocked: activeMax >= WELL_STOCKED_MIN && (activeCounts.get(category.key) ?? 0) === activeMax,
        sentence: cluster ? describeCluster(cluster) : null,
      };
    })
    .sort((a, b) => b.count - a.count);
}
