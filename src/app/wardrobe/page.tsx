import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import { capitalizeFirst } from "@/lib/wardrobeDisplay";
import { toWardrobeEntry } from "@/lib/wardrobeEntries";
import { CATEGORIES, OTHER_CATEGORY, type Sort, type WardrobeEntry } from "@/lib/wardrobeView";
import { BigNumeral } from "@/components/kit/BigNumeral";
import { PageHero } from "@/components/kit/PageHero";
import { WardrobeBrowser } from "./WardrobeBrowser";
import styles from "./page.module.css";

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
  // Grid is the default on every visit; only Home's "See your closet" link asks for Rack.
  const initialView = firstParam(resolvedSearchParams.view) === "rack" ? "rack" : "grid";

  // Not just status: "active" - a needs_review item must still show (with its
  // own tag) for that state to ever be reachable. "returned" items are the
  // only ones excluded, matching what this page has always considered "in the
  // wardrobe".
  const rows = await prisma.wardrobeItem.findMany({
    where: { userId, status: { not: "returned" } },
    include: { sourcePurchase: { select: { merchant: true, price: true } } },
  });

  const items: WardrobeEntry[] = rows.map(toWardrobeEntry);

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
      <WardrobeBrowser items={items} initialCategory={initialCategory} initialSort={initialSort} initialView={initialView} addPanel={addPanel} />
    </div>
  );
}
