import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { devWardrobeWhere } from "@/lib/devWardrobeView";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { ColorPickerField } from "@/components/ColorPicker";
import { commonColors } from "@/lib/pieceForm";
import { BRAND_LIST } from "@/lib/brands/matchBrand";
import styles from "./confirm.module.css";

const DEFAULT_CATEGORY_OPTIONS = [
  "tops",
  "bottoms",
  "outerwear",
  "dresses",
  "shoes",
  "bags",
  "accessories",
  "jewelry",
  "swimwear",
  "activewear",
];

// Auto-generated from this user's own history, not a fixed enum - a
// category dropdown that only ever offers what they've actually used
// (plus this item's own current value, even if it's new) stays meaningful
// as their wardrobe grows, rather than drifting from a hardcoded list.
async function categoryOptionsFor(userId: string, currentCategory: string | null): Promise<string[]> {
  const [desired, wardrobe, purchases] = await Promise.all([
    prisma.desiredItem.findMany({ where: { userId, category: { not: null } }, select: { category: true } }),
    prisma.wardrobeItem.findMany({ where: { userId, category: { not: null }, ...devWardrobeWhere() }, select: { category: true } }),
    prisma.purchase.findMany({ where: { userId }, select: { category: true } }),
  ]);

  const seen = new Map<string, string>();
  for (const { category } of [...desired, ...wardrobe, ...purchases]) {
    if (!category) continue;
    const key = category.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, category.trim());
  }
  if (currentCategory) {
    const key = currentCategory.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, currentCategory.trim());
  }

  if (seen.size === 0) {
    return DEFAULT_CATEGORY_OPTIONS;
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export default async function ConfirmDesiredItemPage({
  params,
}: PageProps<"/desired-items/[id]/confirm">) {
  const userId = await requireUserIdOrRedirect();
  const { id } = await params;
  const item = await prisma.desiredItem.findFirst({ where: { id, userId } });
  if (!item) {
    notFound();
  }
  const extractionFailed = !item.itemName;
  const isLowConfidence = item.itemNameConfidence === "low";
  const categoryOptions = await categoryOptionsFor(userId, item.category);
  const closetColors = await prisma.wardrobeItem.findMany({
    where: { userId, status: { not: "returned" }, ...devWardrobeWhere() },
    select: { colorFamily: true },
  });

  return (
    <div className="page page--narrow">
      <PageHeader
        back={{ href: "/desired-items/new", label: "Pause a purchase" }}
        title="Confirm this item"
        subtitle="Check the details, then see it next to your closet."
      />

      {extractionFailed ? (
        <p className="page__lede">
          We couldn&apos;t read the item {item.sourceType === "url" ? "from that link" : "from that screenshot"}. Add the
          details yourself.
        </p>
      ) : isLowConfidence ? (
        <p className="page__lede">
          {item.sourceType === "url"
            ? "We couldn't load that page, so this name is a best guess from the link itself. Check it's right."
            : "This is a best guess, not a confirmed match. Check it's right."}
        </p>
      ) : (
        <p className="page__lede">Here&apos;s what we found. Fix anything that&apos;s wrong.</p>
      )}

      <form action={`/api/desired-items/${item.id}/confirm`} method="POST" className={styles.card}>
        <div className={styles.photo}>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.itemName ?? "The item"} />
          ) : (
            <span className={styles.noPhoto}>No photo</span>
          )}
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="itemName">Name</label>
            <input id="itemName" name="itemName" defaultValue={item.itemName ?? ""} required />
          </div>

          <div className={styles.pair}>
            <div className={styles.field}>
              <label htmlFor="brand">
                Brand <span className={styles.optional}>Optional</span>
              </label>
              <input id="brand" name="brand" list="brand-options" defaultValue={item.brand ?? ""} autoComplete="off" />
              <datalist id="brand-options">
                {BRAND_LIST.map((brand) => (
                  <option key={brand.name} value={brand.name} />
                ))}
              </datalist>
            </div>
            <div className={styles.field}>
              <label htmlFor="price">
                Price <span className={styles.optional}>Optional</span>
              </label>
              <div className={styles.prefixed}>
                <span aria-hidden="true">$</span>
                <input
                  id="price"
                  name="price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  defaultValue={item.price ? Number(item.price) : ""}
                  aria-describedby="price-help"
                />
              </div>
            </div>
          </div>
          <p id="price-help" className={styles.help}>
            With a price, PAUSE can show what this does to your monthly plan.
          </p>

          <div className={styles.pair}>
            <div className={styles.field}>
              <label htmlFor="category">Category</label>
              <select id="category" name="category" defaultValue={item.category ?? ""}>
                <option value="">Choose one</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ColorPickerField
            common={commonColors(closetColors.map((row) => row.colorFamily))}
            initialFamily={item.colorFamily ?? ""}
            initialOther={item.colorName ?? ""}
          />

          {/* Rarely needed, so out of the way (Polaris: progressive disclosure). */}
          <details className={styles.more}>
            <summary>More details</summary>
            <div className={styles.moreFields}>
              <div className={styles.field}>
                <label htmlFor="imageUrl">Photo link</label>
                <input id="imageUrl" name="imageUrl" type="url" defaultValue={item.imageUrl ?? ""} placeholder="https://" />
              </div>
              <div className={styles.field}>
                <label htmlFor="styleTags">Style words</label>
                <input
                  id="styleTags"
                  name="styleTags"
                  defaultValue={item.styleTags.join(", ")}
                  aria-describedby="tags-help"
                />
                <p id="tags-help" className={styles.help}>
                  Separate with commas, for example minimal, oversized.
                </p>
              </div>
            </div>
          </details>

          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary">
              Continue
            </button>
            <Link href="/desired-items/new" className="btn-quiet">
              Start over
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
