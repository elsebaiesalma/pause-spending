import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import { capitalizeFirst, stripBrandPrefix } from "@/lib/wardrobeDisplay";
import { CATEGORIES, OTHER_CATEGORY, categoryKeyOf, type Sort, type WardrobeEntry } from "@/lib/wardrobeView";
import { BigNumeral } from "@/components/kit/BigNumeral";
import { PageHero } from "@/components/kit/PageHero";
import { WardrobeBrowser } from "./WardrobeBrowser";
import styles from "./page.module.css";

// ownedSince is a date-only column stored at UTC midnight, so it must be
// formatted in UTC or it shows the previous month west of Greenwich.
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WardrobePage({ searchParams }: PageProps<"/wardrobe">) {
  const userId = await requireUserIdOrRedirect();
  const resolvedSearchParams = await searchParams;

  // ?category= and ?sort= only choose the starting state of the Grid view.
  const categoryParam = firstParam(resolvedSearchParams.category);
  const initialCategory = [...CATEGORIES, OTHER_CATEGORY].some((c) => c.key === categoryParam)
    ? (categoryParam as string)
    : "all";
  const initialSort: Sort = firstParam(resolvedSearchParams.sort) === "price" ? "price" : "newest";

  // Not just status: "active" - a needs_review item must still show (with its
  // own tag) for that state to ever be reachable. "returned" items are the
  // only ones excluded, matching what this page has always considered "in the
  // wardrobe".
  const rows = await prisma.wardrobeItem.findMany({
    where: { userId, status: { not: "returned" } },
    include: { sourcePurchase: { select: { merchant: true, price: true } } },
  });

  const items: WardrobeEntry[] = rows.map((item) => {
    const brand = item.sourcePurchase?.merchant ?? null;
    const colorName = item.colorName ?? item.colorFamily;
    return {
      id: item.id,
      displayName: stripBrandPrefix(item.itemName, brand),
      brand,
      category: item.category,
      categoryKey: categoryKeyOf(item.category),
      colorLabel: colorName ? capitalizeFirst(colorName) : null,
      colorFamily: item.colorFamily,
      price: item.sourcePurchase?.price != null ? Number(item.sourcePurchase.price) : null,
      ownedSince: item.ownedSince ? MONTH_YEAR_FORMAT.format(item.ownedSince) : null,
      sortTime: item.ownedSince?.getTime() ?? 0,
      // Seeded rows carry mock photos too; a row with no image gets the
      // designed placeholder card in both views.
      imageUrl: item.imageUrl || null,
      needsReview: item.status === "needs_review",
    };
  });

  const addPanel = (
    <section id="add-to-wardrobe" className={styles.addPanel}>
      <h2>Add to wardrobe</h2>
      <form action="/api/wardrobe" method="POST">
        <input name="itemName" placeholder="Item name (required)" required />
        <input name="category" placeholder="Category, e.g. tops" />
        <label htmlFor="colorFamily">Color</label>
        <select id="colorFamily" name="colorFamily" defaultValue="">
          <option value="">Choose a color</option>
          {COLOR_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {capitalizeFirst(family)}
            </option>
          ))}
        </select>
        <input name="colorName" placeholder="Color name (optional), e.g. Espresso" />
        <input name="styleTags" placeholder="Style tags (comma separated)" />
        <input name="useCaseTags" placeholder="Use-case tags (comma separated)" />
        <label htmlFor="ownedSince">Owned since</label>
        <input id="ownedSince" name="ownedSince" type="date" />
        <div className="row">
          <button type="submit" className="btn-primary">
            Add to wardrobe
          </button>
          <a href="#" className="btn-quiet">
            Cancel
          </a>
        </div>
      </form>
    </section>
  );

  return (
    <div className="page">
      <PageHero eyebrow="What you own" title="What you already own is the starting point." />
      <div className={styles.numeral}>
        <BigNumeral label="Pieces" value={items.length} />
      </div>
      <WardrobeBrowser items={items} initialCategory={initialCategory} initialSort={initialSort} addPanel={addPanel} />
    </div>
  );
}
