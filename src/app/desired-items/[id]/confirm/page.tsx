import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import { BRAND_LIST } from "@/lib/brands/matchBrand";

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
    prisma.wardrobeItem.findMany({ where: { userId, category: { not: null } }, select: { category: true } }),
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

  return (
    <div className="page">
      <span className="page__eyebrow">One more look</span>
      <h1>Confirm this item</h1>

      {extractionFailed ? (
        <p className="page__lede">
          We couldn&apos;t automatically identify the item{" "}
          {item.sourceType === "url" ? "from that link" : "from that screenshot"}. Please fill in the
          details yourself.
        </p>
      ) : isLowConfidence ? (
        <p className="page__lede">
          {item.sourceType === "url"
            ? "We couldn't load that page directly, so this name is a best guess from the link itself - please check it's right."
            : "This is a low-confidence guess, not a confirmed match - please check it's right."}
        </p>
      ) : (
        <p className="page__lede">Here&apos;s what we found - correct anything that&apos;s wrong before continuing.</p>
      )}

      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.itemName ?? "Item"}
          width={120}
          height={120}
          style={{ objectFit: "cover", marginTop: "1.25rem", marginBottom: "0.5rem" }}
        />
      )}

      <form action={`/api/desired-items/${item.id}/confirm`} method="POST" className="section">
        <label htmlFor="itemName">Item name</label>
        <input id="itemName" name="itemName" defaultValue={item.itemName ?? ""} placeholder="Item name" required />
        <label htmlFor="brand">Brand</label>
        <input
          id="brand"
          name="brand"
          list="brand-options"
          defaultValue={item.brand ?? ""}
          placeholder="Brand (pick one or type your own)"
          autoComplete="off"
        />
        <datalist id="brand-options">
          {BRAND_LIST.map((brand) => (
            <option key={brand.name} value={brand.name} />
          ))}
        </datalist>
        <label htmlFor="price">
          Price{" "}
          <small style={{ color: "var(--color-ink-soft)", fontWeight: 400 }}>
            (needed before budget impact can be computed - leave blank if unsure)
          </small>
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item.price ? Number(item.price) : ""}
          placeholder="Price"
        />
        <label htmlFor="imageUrl">Image URL</label>
        <input id="imageUrl" name="imageUrl" defaultValue={item.imageUrl ?? ""} placeholder="Image URL" />
        <label htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={item.category ?? ""}>
          <option value="">Uncategorized</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <label htmlFor="colorName">Color</label>
        <input id="colorName" name="colorName" defaultValue={item.colorName ?? ""} placeholder="e.g. Espresso" />
        <label htmlFor="colorFamily">Color family</label>
        <select id="colorFamily" name="colorFamily" defaultValue={item.colorFamily ?? ""}>
          <option value="">Unset</option>
          {COLOR_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {family}
            </option>
          ))}
        </select>
        <label htmlFor="styleTags">Style tags</label>
        <input
          id="styleTags"
          name="styleTags"
          defaultValue={item.styleTags.join(", ")}
          placeholder="Style tags (comma separated)"
        />
        <button type="submit" className="btn-primary">
          Confirm
        </button>
      </form>

      <p className="section">
        <a href="/desired-items/new" className="btn-quiet">
          Cancel, start over
        </a>
      </p>
    </div>
  );
}
