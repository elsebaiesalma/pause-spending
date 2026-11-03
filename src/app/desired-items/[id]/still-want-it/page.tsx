import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { ColorDot } from "@/components/ColorDot";
import { getReflectionAnswer } from "@/lib/pauseScreen/reflection";
import { buildReflectionSummary } from "@/lib/considering/assembleConsidering";
import { hasLookForDesiredItem } from "@/lib/looks/looks";
import { retailerFromRawInput } from "@/lib/stillWantIt/retailer";
import { getStoreVisitState, shouldAskDidYouBuy } from "@/lib/stillWantIt/storeVisit";
import { OutfitSection, OutfitSkeleton } from "./OutfitSection";
import styles from "./page.module.css";

// Reached from "Buy anyway" on the Pause screen. Everything here is read
// through the signed-in user's id, so another user's item is a 404.
export default async function StillWantItPage({ params }: PageProps<"/desired-items/[id]/still-want-it">) {
  const userId = await requireUserIdOrRedirect();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const item = await prisma.desiredItem.findFirst({ where: { id, userId } });
  if (!item) notFound();

  const [reflection, storeState] = await Promise.all([
    getReflectionAnswer(id, userId),
    getStoreVisitState(id, userId),
  ]);

  const replacedItem = reflection?.replacesWardrobeItemId
    ? await prisma.wardrobeItem.findFirst({
        where: { id: reflection.replacesWardrobeItemId, userId },
        select: { itemName: true },
      })
    : null;
  const reflectionSummary = buildReflectionSummary(reflection, replacedItem?.itemName ?? null);

  const price = item.price ? Number(item.price) : null;
  const retailer = retailerFromRawInput(item.rawInput);
  const hasLook = await hasLookForDesiredItem(userId, id);
  const askDidYouBuy = shouldAskDidYouBuy(storeState);

  return (
    <div className="page">
      <Link href={`/desired-items/${item.id}`} className={styles.backLink}>
        <span aria-hidden="true">&larr;</span> Item details
      </Link>

      <header className={styles.header}>
        {item.imageUrl && (
          <div className={styles.image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={item.itemName ?? "Item"} />
          </div>
        )}
        <div className={styles.headerText}>
          {item.brand && <p className={styles.brand}>{item.brand}</p>}
          <h1>{item.itemName || "This item"}</h1>
          <div className={styles.metaLine}>
            <ColorDot colorFamily={item.colorFamily} />
            <span>{price !== null ? `$${price.toFixed(0)}` : "Price not set"}</span>
          </div>
        </div>
      </header>

      {askDidYouBuy && (
        <section className={styles.visitPrompt} aria-labelledby="did-you-buy">
          <h2 id="did-you-buy">Did you buy it?</h2>
          <form action={`/api/desired-items/${id}/store-visit-answer`} method="POST" className={styles.visitYes}>
            <input type="hidden" name="answer" value="bought" />
            <label className={styles.priceField}>
              <span>Price you paid</span>
              <input type="number" name="price" min="0.01" step="0.01" inputMode="decimal" required />
            </label>
            <button type="submit" className="btn-primary btn-sized">
              Yes, I bought it
            </button>
          </form>
          <div className={styles.visitOther}>
            <form action={`/api/desired-items/${id}/store-visit-answer`} method="POST">
              <button type="submit" name="answer" value="not_bought" className="btn-sized">
                No
              </button>
            </form>
            <form action={`/api/desired-items/${id}/store-visit-answer`} method="POST">
              <button type="submit" name="answer" value="not_sure" className="btn-sized">
                Not sure yet
              </button>
            </form>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="wear-what-you-own">
        <p className={styles.sectionLabel} id="wear-what-you-own">
          Wear what you own
        </p>
        <Suspense fallback={<OutfitSkeleton />}>
          <OutfitSection userId={userId} desiredItemId={id} />
        </Suspense>
      </section>

      <section className="section" aria-labelledby="build-from-closet">
        <p className={styles.sectionLabel} id="build-from-closet">
          Build it from your closet
        </p>
        <p className={styles.reflection}>
          {hasLook
            ? "You have built a look for this one. Open it to keep rearranging."
            : "Lay out a look from what you already own, and see how this piece would fit."}
        </p>
        <div className="action-group">
          <Link
            href={`/lookbook/board?for=${id}&returnTo=${encodeURIComponent(`/desired-items/${id}/still-want-it`)}`}
            className="btn action"
          >
            {hasLook ? "Open your look" : "Build it from your closet"}
          </Link>
        </div>
      </section>

      <section className="section" aria-labelledby="one-last-check">
        <p className={styles.sectionLabel} id="one-last-check">
          One last check
        </p>
        <p className={styles.reflection}>
          {reflectionSummary ?? (hasLook ? "You built a look from your closet." : "No reflection answers were saved for this item.")}
        </p>

        <div className={`action-group ${styles.actions}`}>
          <form action={`/api/desired-items/${id}/wait`} method="POST">
            <input type="hidden" name="duration" value="24h" />
            <button type="submit" className="btn-primary action">
              Pause for 24 hours
            </button>
          </form>
          <form action={`/api/desired-items/${id}/resolve`} method="POST">
            <input type="hidden" name="outcome" value="dropped" />
            <button type="submit" className="action">
              Let it go
            </button>
          </form>
        </div>

        {retailer && (
          <p className={styles.storeLink}>
            <a
              href={`/api/desired-items/${id}/go-to-store`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Go to {retailer.name}
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
