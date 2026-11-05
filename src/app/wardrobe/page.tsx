import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { devWardrobeWhere } from "@/lib/devWardrobeView";
import { toWardrobeEntry } from "@/lib/wardrobeEntries";
import { buildConcentration } from "@/lib/wardrobeClusters";
import { CATEGORIES, OTHER_CATEGORY, type Sort, type WardrobeEntry } from "@/lib/wardrobeView";
import { PageHeader } from "@/components/PageHeader";
import { ClosetTabs } from "@/components/ClosetTabs";
import { isPhotoStorageAvailable } from "@/lib/photos/photoStore";
import { PieceForm } from "@/components/PieceForm";
import { commonColors } from "@/lib/pieceForm";
import { ClosetConcentration } from "./ClosetConcentration";
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
  const [rows, lookCount] = await Promise.all([
    prisma.wardrobeItem.findMany({
      where: { userId, status: { not: "returned" }, ...devWardrobeWhere() },
      include: { sourcePurchase: { select: { merchant: true, price: true } } },
    }),
    prisma.look.count({ where: { userId } }),
  ]);

  const items: WardrobeEntry[] = rows.map(toWardrobeEntry);

  // Well-stocked categories hold a cluster of 3+ near-duplicate active items.
  const concentration = buildConcentration(
    rows.map((row, index) => ({
      id: row.id,
      categoryKey: items[index].categoryKey,
      colorFamily: row.colorFamily,
      styleTags: row.styleTags,
      status: row.status,
    }))
  );
  const wellStocked = concentration.filter((row) => row.wellStocked).map((row) => row.key);

  const photosEnabled = await isPhotoStorageAvailable();

  const addPanel = (
    <section id="add-to-wardrobe" className={styles.addPanel}>
      <h2>Add a piece</h2>
      <PieceForm
        mode="add"
        action="/api/wardrobe"
        cancelHref="#"
        submitLabel="Add to closet"
        commonColors={commonColors(rows.map((row) => row.colorFamily))}
        photosEnabled={photosEnabled}
      />
    </section>
  );

  return (
    <div className="page">
      <PageHeader
        title="Closet"
        subtitle="What you already own is the starting point."
        action={
          <a href="#add-to-wardrobe" className="btn btn-primary">
            Add a piece
          </a>
        }
      />
      <ClosetTabs current="pieces" pieces={items.length} looks={lookCount} />
      <ClosetConcentration rows={concentration} />
      <WardrobeBrowser items={items} wellStocked={wellStocked} initialCategory={initialCategory} initialSort={initialSort} initialView={initialView} addPanel={addPanel} />
    </div>
  );
}
