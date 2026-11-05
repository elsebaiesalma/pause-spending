"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ColorDot } from "@/components/ColorDot";
import { SlidingToggle } from "@/components/SlidingToggle";
import {
  CATEGORIES,
  OTHER_CATEGORY,
  matchesQuery,
  sortEntries,
  type Sort,
  type WardrobeEntry,
} from "@/lib/wardrobeView";
import { Rack, type ScrollTarget } from "./Rack";
import { ItemImage, ItemMenu } from "./WardrobeParts";
import styles from "./page.module.css";

type View = "grid" | "rack";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "rack", label: "Rack" },
];

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price" },
];

// The toolbar, category chips and both views. Grid always opens first: the
// view is plain component state, never remembered between visits.
export function WardrobeBrowser({
  items,
  wellStocked = [],
  initialCategory,
  initialSort,
  initialView = "grid",
  addPanel,
}: {
  items: WardrobeEntry[];
  // Category keys that hold a cluster of 3+ near-duplicates.
  wellStocked?: string[];
  initialCategory: string;
  initialSort: Sort;
  initialView?: View;
  addPanel: ReactNode;
}) {
  const [view, setView] = useState<View>(initialView);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null);

  const counts = useMemo(() => {
    const byKey = new Map<string, number>();
    for (const item of items) byKey.set(item.categoryKey, (byKey.get(item.categoryKey) ?? 0) + 1);
    return byKey;
  }, [items]);

  // Only categories that have something in them get a chip.
  const chips = useMemo(
    () => [...CATEGORIES, OTHER_CATEGORY].filter((c) => (counts.get(c.key) ?? 0) > 0),
    [counts]
  );

  const searched = useMemo(() => sortEntries(items.filter((item) => matchesQuery(item, query)), sort), [items, query, sort]);
  const gridItems = useMemo(
    () => (category === "all" ? searched : searched.filter((item) => item.categoryKey === category)),
    [searched, category]
  );

  function chooseCategory(key: string) {
    if (view === "rack") {
      // In the rack the chips are a table of contents, not a filter.
      setScrollTarget((prev) => ({ key: key === "all" ? "start" : key, nonce: (prev?.nonce ?? 0) + 1 }));
    } else {
      setCategory(key);
    }
  }

  const chipActive = (key: string) => view === "grid" && category === key;

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <label htmlFor="wardrobe-search" className={styles.srOnly}>
            Search your closet
          </label>
          <input
            id="wardrobe-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your closet"
            autoComplete="off"
          />
        </div>
        <div className={styles.toolbarActions}>
          <SlidingToggle options={VIEW_OPTIONS} value={view} onChange={setView} label="View" />
        </div>
      </div>

      {/* Opens with the toolbar button (:target), so the form is at the top of
          the page instead of buried below a long grid or rack. */}
      {addPanel}

      <div className={styles.filters}>
        <div className={styles.chipRow} role="group" aria-label={view === "rack" ? "Jump to category" : "Filter by category"}>
          <button type="button" className={styles.chip} aria-current={chipActive("all") ? "true" : undefined} onClick={() => chooseCategory("all")}>
            All ({items.length})
          </button>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={styles.chip}
              aria-current={chipActive(chip.key) ? "true" : undefined}
              onClick={() => chooseCategory(chip.key)}
            >
              {chip.label} ({counts.get(chip.key)})
              {wellStocked.includes(chip.key) && <span className={styles.chipTag}>Similar pieces</span>}
            </button>
          ))}
        </div>

        <div className={styles.sortRow}>
          <span>Sort</span>
          <SlidingToggle options={SORT_OPTIONS} value={sort} onChange={setSort} label="Sort items" />
        </div>
      </div>

      {view === "rack" ? (
        searched.length === 0 ? (
          <p className={styles.emptyState}>{items.length === 0 ? "Nothing on the rack yet." : "No pieces match your search."}</p>
        ) : (
          <Rack items={searched} scrollTarget={scrollTarget} wellStocked={wellStocked} />
        )
      ) : gridItems.length === 0 ? (
        <p className={styles.emptyState}>
          {query.trim() ? "No pieces match your search." : "No items in this category yet."}
        </p>
      ) : (
        <div className={styles.grid}>
          {gridItems.map((item) => (
            <article key={item.id} className={styles.card}>
              <a href={`/wardrobe/${item.id}/edit`} className={styles.cardLink} aria-label={`Edit ${item.displayName}`} />

              <div className={styles.cardImage}>
                <ItemImage item={item} sizes="(min-width: 1024px) 18rem, (min-width: 640px) 33vw, 50vw" />
                {item.needsReview && <span className={`badge-review ${styles.reviewBadge}`}>Needs review</span>}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  {item.brand && <p className={styles.cardBrand}>{item.brand}</p>}
                  {item.ownedSince && <p className={styles.cardDate}>{item.ownedSince}</p>}
                </div>
                <h3 className={styles.cardName}>{item.displayName}</h3>
                <div className={styles.cardFoot}>
                  <p className={item.price === null ? styles.priceNotSet : styles.cardPrice}>
                    {item.price !== null ? `$${item.price.toFixed(0)}` : "Price not set"}
                  </p>
                  {item.colorLabel && (
                    <p className={styles.cardColor}>
                      <ColorDot colorFamily={item.colorFamily} />
                      {item.colorLabel}
                    </p>
                  )}
                </div>
              </div>

              <ItemMenu item={item} />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
