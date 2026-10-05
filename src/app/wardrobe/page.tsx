import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import { GarmentSilhouette, silhouetteForItem } from "./GarmentSilhouette";
import { ColorDot } from "@/components/ColorDot";
import styles from "./page.module.css";

const CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "knitwear", label: "Knitwear" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "bags", label: "Bags" },
] as const;

type Category = (typeof CATEGORY_FILTERS)[number]["value"];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price" },
] as const;

type Sort = (typeof SORT_OPTIONS)[number]["value"];

const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Renders a list of nodes on one meta line, separated by " · " - keeps the
// "no price" / "no color" / "no date" cases from producing a stray leading
// or doubled separator, since each part is only added when it has content.
function MetaLine({ parts }: { parts: ReactNode[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && " · "}
          {part}
        </span>
      ))}
    </>
  );
}

export default async function WardrobePage({ searchParams }: PageProps<"/wardrobe">) {
  const userId = await requireUserIdOrRedirect();
  const resolvedSearchParams = await searchParams;

  const categoryParam = firstParam(resolvedSearchParams.category);
  const category: Category = CATEGORY_FILTERS.some((c) => c.value === categoryParam)
    ? (categoryParam as Category)
    : "all";

  const sortParam = firstParam(resolvedSearchParams.sort);
  const sort: Sort = SORT_OPTIONS.some((s) => s.value === sortParam) ? (sortParam as Sort) : "newest";

  // Not just status: "active" - a needs_review item must still show on the
  // grid (with its own tag, see below) for that state to ever be reachable.
  // "returned" items are the only ones excluded, matching what this page
  // has always considered "in the wardrobe".
  const items = await prisma.wardrobeItem.findMany({
    where: { userId, status: { not: "returned" } },
    include: { sourcePurchase: { select: { merchant: true, price: true } } },
  });

  const categoryCounts: Record<Category, number> = {
    all: items.length,
    tops: 0,
    bottoms: 0,
    knitwear: 0,
    outerwear: 0,
    shoes: 0,
    bags: 0,
  };
  for (const item of items) {
    const key = item.category?.toLowerCase();
    if (key && key in categoryCounts && key !== "all") {
      categoryCounts[key as Exclude<Category, "all">] += 1;
    }
  }

  const filtered = category === "all" ? items : items.filter((item) => item.category?.toLowerCase() === category);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price") {
      const aPrice = a.sourcePurchase?.price != null ? Number(a.sourcePurchase.price) : null;
      const bPrice = b.sourcePurchase?.price != null ? Number(b.sourcePurchase.price) : null;
      if (aPrice === null && bPrice === null) return 0;
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return aPrice - bPrice;
    }
    const aTime = a.ownedSince?.getTime() ?? 0;
    const bTime = b.ownedSince?.getTime() ?? 0;
    return bTime - aTime;
  });

  function hrefFor(next: { category?: Category; sort?: Sort }) {
    const params = new URLSearchParams();
    const nextCategory = next.category ?? category;
    const nextSort = next.sort ?? sort;
    if (nextCategory !== "all") params.set("category", nextCategory);
    if (nextSort !== "newest") params.set("sort", nextSort);
    const qs = params.toString();
    return qs ? `/wardrobe?${qs}` : "/wardrobe";
  }

  return (
    <div className="page page--wide">
      <span className="page__eyebrow">What you own</span>
      <div className={styles.header}>
        <h1>Wardrobe</h1>
        <span className={styles.count}>{items.length}</span>
      </div>

      <div className={styles.filters}>
        <div className={styles.chipRow} role="group" aria-label="Filter by category">
          {CATEGORY_FILTERS.map((filter) => (
            <a
              key={filter.value}
              href={hrefFor({ category: filter.value })}
              className={styles.chip}
              aria-current={category === filter.value ? "true" : undefined}
            >
              {filter.label} ({categoryCounts[filter.value]})
            </a>
          ))}
        </div>

        <div className={styles.sortRow}>
          <span>Sort</span>
          <span className={styles.sortLinks} role="group" aria-label="Sort items">
            {SORT_OPTIONS.map((option) => (
              <a
                key={option.value}
                href={hrefFor({ sort: option.value })}
                className={styles.sortLink}
                aria-current={sort === option.value ? "true" : undefined}
              >
                {option.label}
              </a>
            ))}
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.emptyState}>No items in this category yet.</p>
      ) : (
        <div className={styles.grid}>
          {sorted.map((item) => {
            const isSeed = item.source === "seed";
            const shape = isSeed ? silhouetteForItem(item.category, item.itemName) : null;
            const showSilhouette = isSeed && Boolean(item.imageUrl) && shape !== null;
            const showRealImage = !isSeed && Boolean(item.imageUrl);
            const brand = item.sourcePurchase?.merchant ?? null;
            const price = item.sourcePurchase?.price != null ? Number(item.sourcePurchase.price) : null;
            const ownedSince = item.ownedSince ? MONTH_YEAR_FORMAT.format(item.ownedSince) : null;

            const metaParts: ReactNode[] = [];
            if (item.colorName) metaParts.push(item.colorName);
            metaParts.push(
              price !== null ? (
                `$${price.toFixed(0)}`
              ) : (
                <span className={styles.priceNotSet}>Price not set</span>
              )
            );
            if (ownedSince) metaParts.push(ownedSince);

            return (
              <article key={item.id} className={styles.card}>
                <a
                  href={`/wardrobe/${item.id}/edit`}
                  className={styles.cardLink}
                  aria-label={`Edit ${item.itemName}`}
                />

                <div className={styles.cardImage}>
                  {showRealImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl!} alt={item.itemName} />
                  ) : showSilhouette ? (
                    <GarmentSilhouette shape={shape!} colorFamily={item.colorFamily} />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <span className={styles.imagePlaceholderLabel}>{item.category || "No category"}</span>
                    </div>
                  )}
                  {item.status === "needs_review" && (
                    <span className={`badge-review ${styles.reviewBadge}`}>Needs review</span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  {brand && <p className={styles.cardBrand}>{brand}</p>}
                  <h3 className={styles.cardName}>{item.itemName}</h3>
                  <div className={styles.cardMeta}>
                    <ColorDot colorFamily={item.colorFamily} />
                    <MetaLine parts={metaParts} />
                  </div>
                </div>

                <details className={styles.menu}>
                  <summary className={styles.menuToggle} aria-label={`More actions for ${item.itemName}`}>
                    ⋯
                  </summary>
                  <div className={styles.menuPanel}>
                    <a href={`/wardrobe/${item.id}/edit`}>Edit</a>
                    <form action={`/api/wardrobe/${item.id}/return`} method="POST">
                      <button type="submit">Mark returned</button>
                    </form>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}

      <section className="section">
        <h2>Add an item</h2>
        <form action="/api/wardrobe" method="POST">
          <input name="itemName" placeholder="Item name (required)" required />
          <input name="category" placeholder="Category, e.g. tops" />
          <input name="colorName" placeholder="Color, e.g. Espresso" />
          <select name="colorFamily" defaultValue="">
            <option value="">Color family (unset)</option>
            {COLOR_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
          <input name="styleTags" placeholder="Style tags (comma separated)" />
          <input name="useCaseTags" placeholder="Use-case tags (comma separated)" />
          <label htmlFor="ownedSince">Owned since</label>
          <input id="ownedSince" name="ownedSince" type="date" />
          <button type="submit">Add to wardrobe</button>
        </form>
      </section>
    </div>
  );
}
