import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { ColorDot } from "@/components/ColorDot";
import { getReflectionAnswer } from "@/lib/pauseScreen/reflection";
import { buildReflectionSummary } from "@/lib/considering/assembleConsidering";
import { buildResaleSearchLinks } from "@/lib/stillWantIt/secondhand";
import { getStoredRetailerAlternatives, retailerFromRawInput } from "@/lib/stillWantIt/retailer";
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
  const alternatives = getStoredRetailerAlternatives();
  const resaleLinks = buildResaleSearchLinks(item.brand, item.itemName);
  const askDidYouBuy = shouldAskDidYouBuy(storeState);

  return (
    <div className="page">
      <span className="page__eyebrow">Still want it</span>

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
          01 / Wear what you own
        </p>
        <Suspense fallback={<OutfitSkeleton />}>
          <OutfitSection userId={userId} desiredItemId={id} />
        </Suspense>
      </section>

      {alternatives.length > 0 && (
        <section className="section" aria-labelledby="lower-priced">
          <p className={styles.sectionLabel} id="lower-priced">
            02 / Lower-priced options
          </p>
          <ul className={styles.textRows}>
            {alternatives.map((alt, index) => (
              <li key={index}>
                <a href={alt.url} target="_blank" rel="noopener noreferrer">
                  {[alt.brand, alt.name].filter(Boolean).join(" ")}
                </a>
                {alt.price !== null && <span>${alt.price.toFixed(2)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {resaleLinks.length > 0 && (
        <section className="section" aria-labelledby="secondhand">
          <p className={styles.sectionLabel} id="secondhand">
            03 / Secondhand
          </p>
          <ul className={styles.textRows}>
            {resaleLinks.map((site) => (
              <li key={site.name}>
                <a href={site.url} target="_blank" rel="noopener noreferrer">
                  Search on {site.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section" aria-labelledby="one-last-check">
        <p className={styles.sectionLabel} id="one-last-check">
          04 / One last check
        </p>
        <p className={styles.reflection}>
          {reflectionSummary ?? "No reflection answers were saved for this item."}
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
