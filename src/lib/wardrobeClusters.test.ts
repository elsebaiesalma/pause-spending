import { describe, expect, it } from "vitest";
import {
  WELL_STOCKED_MIN,
  buildConcentration,
  describeCluster,
  findClusters,
  nearDuplicates,
  type ClusterItem,
} from "./wardrobeClusters";

let n = 0;
function item(overrides: Partial<ClusterItem> = {}): ClusterItem {
  n += 1;
  return {
    id: `i${n}`,
    categoryKey: "tops",
    colorFamily: "black",
    styleTags: ["basic"],
    status: "active",
    ...overrides,
  };
}

describe("nearDuplicates", () => {
  it("needs the same category, the same color family and a shared style tag", () => {
    expect(nearDuplicates(item(), item())).toBe(true);
    expect(nearDuplicates(item(), item({ categoryKey: "bottoms" }))).toBe(false);
    expect(nearDuplicates(item(), item({ colorFamily: "navy" }))).toBe(false);
    expect(nearDuplicates(item(), item({ styleTags: ["formal"] }))).toBe(false);
    expect(nearDuplicates(item({ styleTags: [] }), item({ styleTags: [] }))).toBe(false);
  });

  it("never treats a missing color family as a match, even against another missing one", () => {
    expect(nearDuplicates(item({ colorFamily: null }), item({ colorFamily: null }))).toBe(false);
    expect(nearDuplicates(item({ colorFamily: null }), item())).toBe(false);
  });
});

describe("findClusters threshold", () => {
  it("is 3 near-duplicates", () => {
    expect(WELL_STOCKED_MIN).toBe(3);
    expect(findClusters([item(), item()])).toEqual([]);
    const three = findClusters([item(), item(), item()]);
    expect(three).toHaveLength(1);
    expect(three[0].itemIds).toHaveLength(3);
  });

  it("does not count items that are only similar to different members of other groups", () => {
    // Two black tops and two navy tops: four tops, but no cluster of three.
    expect(
      findClusters([item(), item(), item({ colorFamily: "navy" }), item({ colorFamily: "navy" })])
    ).toEqual([]);
  });

  it("keeps clusters in separate categories apart", () => {
    const clusters = findClusters([
      item(),
      item(),
      item(),
      item({ categoryKey: "bottoms" }),
      item({ categoryKey: "bottoms" }),
    ]);
    expect(clusters.map((c) => c.categoryKey)).toEqual(["tops"]);
  });
});

describe("findClusters exclusions", () => {
  it("never lets items with no color family form a cluster", () => {
    expect(findClusters([item({ colorFamily: null }), item({ colorFamily: null }), item({ colorFamily: null })])).toEqual([]);
  });

  it("leaves a missing-color item out of an otherwise full cluster", () => {
    const clusters = findClusters([item(), item(), item({ colorFamily: null })]);
    expect(clusters).toEqual([]);
  });

  it("ignores returned and needs-review items: active only", () => {
    expect(findClusters([item(), item(), item({ status: "returned" })])).toEqual([]);
    expect(findClusters([item(), item(), item({ status: "needs_review" })])).toEqual([]);
    expect(findClusters([item(), item(), item({ status: "returned" }), item()])).toHaveLength(1);
  });
});

describe("describeCluster", () => {
  it("is a plain count, color and kind, with no percentage", () => {
    const [cluster] = findClusters([item(), item(), item(), item()]);
    const sentence = describeCluster(cluster);
    expect(sentence).toBe("4 similar black tops");
    expect(sentence).not.toMatch(/%/);
  });
});

describe("buildConcentration", () => {
  it("has one row per category with items, biggest first, with a bar share and no empty rows", () => {
    const rows = buildConcentration([
      ...Array.from({ length: 4 }, () => item({ categoryKey: "bottoms", colorFamily: "blue" })),
      item({ categoryKey: "shoes" }),
      item({ categoryKey: "shoes", colorFamily: "brown" }),
    ]);
    expect(rows.map((r) => r.key)).toEqual(["bottoms", "shoes"]);
    expect(rows[0]).toMatchObject({ count: 4, share: 1, wellStocked: true, sentence: "4 similar blue bottoms" });
    expect(rows[1]).toMatchObject({ count: 2, share: 0.5, wellStocked: false, sentence: null });
  });

  it("counts every item shown, but only active ones can make a category well stocked", () => {
    const rows = buildConcentration([item(), item(), item({ status: "returned" })]);
    expect(rows[0]).toMatchObject({ key: "tops", count: 3, wellStocked: false });
  });

  it("gives the sentence to the largest cluster in a category", () => {
    const rows = buildConcentration([
      ...Array.from({ length: 3 }, () => item({ colorFamily: "navy" })),
      ...Array.from({ length: 4 }, () => item({ colorFamily: "black" })),
    ]);
    expect(rows[0].sentence).toBe("4 similar black tops");
  });
});
