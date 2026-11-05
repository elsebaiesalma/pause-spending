import { notFound } from "next/navigation";
import { assemblePauseScreen } from "@/lib/pauseScreen/assemblePauseScreen";
import { requireUserIdOrRedirect } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { REFLECTION_NOTHING_VALUE } from "@/lib/pauseScreen/reflectionForm";
import { ColorDot } from "@/components/ColorDot";
import { ItemArt } from "@/components/ItemArt";
import { stripBrandPrefix } from "@/lib/wardrobeDisplay";
import { listActiveWardrobeItems } from "@/lib/wardrobe";
import { hasLookForDesiredItem } from "@/lib/looks/looks";
import { compareAttributes, similarityBand } from "@/lib/pauseScreen/attributeMatch";
import { BuildLookButton } from "./BuildLookButton";
import { ImpactRows } from "./ImpactRows";
import { ReflectionSteps } from "./ReflectionSteps";
import styles from "./page.module.css";

const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const NEED_SCALE = [1, 2, 3, 4, 5, 6, 7];

// A piece made from an order keeps its brand on the purchase; a hand-added one
// keeps what was typed. Shown as its own line, like the wanted item's brand.
function brandOf(item: { brand?: string | null; sourcePurchase?: { merchant: string } | null }): string | null {
  return item.sourcePurchase?.merchant ?? item.brand ?? null;
}

export default async function PauseScreenPage({ params }: PageProps<"/desired-items/[id]/pause">) {
  const userId = await requireUserIdOrRedirect();
  const { id } = await params;

  let payload;
  try {
    payload = await assemblePauseScreen(userId, id);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      notFound();
    }
    throw error;
  }
  const { desiredItem, similarItems, similarItemReasons, budget, reflection } = payload;

  // A look built from the closet for this item counts as a reflection answer.
  const hasLook = await hasLookForDesiredItem(userId, desiredItem.id);

  const price = desiredItem.price ? Number(desiredItem.price) : null;
  const waitAction = `/api/desired-items/${desiredItem.id}/wait`;
  const resolveAction = `/api/desired-items/${desiredItem.id}/resolve`;

  // The last step: what buying does to the plan, in three rows and one bar
  // that shows this item's share of the month.
  const money = (n: number) => `$${n.toFixed(0)}`;
  const impactStep = !budget.hasBudget ? (
    <p className={styles.emptyNote}>
      No plan set yet -{" "}
      <a href="/budget" className="link">
        set one
      </a>{" "}
      to see how this affects it.
    </p>
  ) : !budget.priceKnown ? (
    <p className={styles.emptyNote}>
      This item has no price yet, so its effect on your plan can&apos;t be shown. Spent so far this month:{" "}
      {money(budget.spend)} of {money(budget.budgetAmount)}.
    </p>
  ) : (
    <ImpactRows
      budget={budget.budgetAmount}
      spent={budget.spend}
      item={budget.spendAfterPurchase - budget.spend}
      after={budget.spendAfterPurchase}
    />
  );

  // The closest owned piece goes side by side with the wanted one; the
  // rest are listed below it. "Closest" is the database's own order, since
  // matching is rule-based and has no finer ranking.
  const [closest, ...others] = similarItems;
  // Same brand line and name style on both sides, so the two names line up.
  const closestBrand = closest ? brandOf(closest) : null;
  const rows = closest ? compareAttributes(desiredItem, closest) : [];

  // The dropdown lists the closest match first, then the other similar pieces,
  // then the rest of the closet in the same category. Its default is what
  // PAUSE matched, unless an earlier answer was saved.
  const sameCategory = desiredItem.category
    ? (await listActiveWardrobeItems(userId)).filter((item) => item.category === desiredItem.category)
    : [];
  const replaceOptions = [...similarItems, ...sameCategory.filter((item) => !similarItems.some((s) => s.id === item.id))];
  const savedReplaces = reflection?.replacesNothing
    ? REFLECTION_NOTHING_VALUE
    : reflection?.replacesWardrobeItemId && replaceOptions.some((item) => item.id === reflection.replacesWardrobeItemId)
      ? reflection.replacesWardrobeItemId
      : null;
  const replacesDefault = savedReplaces ?? closest?.id ?? "";

  return (
    <div className="page">
      <span className="page__eyebrow">Before you buy</span>

      {/* Two columns on a wide screen: the comparison stays pinned on the left
          while the questions, the cost and the decision stack on the right, so
          nothing has to be remembered while scrolling. On a phone the
          comparison is a compact strip that stays under the header. */}
      <div className={styles.layout}>
      {/* 1. You want / you own */}
      <section className={styles.compare} aria-label="What you want next to what you own">
        <div className={styles.comparePair}>
          <div className={styles.compareItem}>
            <p className={styles.compareKicker}>You want</p>
            <div className={styles.compareImage}>
              <ItemArt item={desiredItem} />
            </div>
            {desiredItem.brand && <p className={styles.brand}>{desiredItem.brand}</p>}
            <h1 className={styles.compareTitle}>{desiredItem.itemName || "This item"}</h1>
            <div className={styles.metaLine}>
              <ColorDot colorFamily={desiredItem.colorFamily} />
              <span>{price !== null ? `$${price.toFixed(0)}` : "Price not set"}</span>
            </div>
          </div>

          {closest ? (
            <div className={styles.compareItem}>
              <p className={styles.compareKicker}>You own</p>
              <div className={styles.compareImage}>
                <ItemArt item={closest} />
              </div>
              {closestBrand && <p className={styles.brand}>{closestBrand}</p>}
              <p className={styles.compareTitle}>{stripBrandPrefix(closest.itemName, closestBrand)}</p>
              {closest.ownedSince && (
                <div className={styles.metaLine}>
                  <ColorDot colorFamily={closest.colorFamily} />
                  <span>Bought {MONTH_YEAR_FORMAT.format(closest.ownedSince)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={`${styles.compareItem} ${styles.compareEmpty}`}>
              <p className={styles.compareKicker}>You own</p>
              <p className={styles.compareEmptyText}>Nothing like this in your closet.</p>
              <p className={styles.emptyNote}>It would be new to your closet. The questions below still help.</p>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className={styles.matchGrid}>
            <div className={styles.matchHeader}>
              <span className={`badge ${rows.filter((r) => r.match).length >= 2 ? "badge--dark" : ""}`}>
                {similarityBand(rows)}
              </span>
              <span className={styles.matchReason}>{similarItemReasons[closest.id]}</span>
            </div>
            <table className={styles.matchTable}>
              <caption className="sr-only">How the two items compare</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Attribute</span>
                  </th>
                  <th scope="col">You want</th>
                  <th scope="col">You own</th>
                  <th scope="col">
                    <span className="sr-only">Match</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.wanted}</td>
                    <td>{row.owned}</td>
                    <td>
                      <span className={row.match ? styles.matchYes : styles.matchNo}>
                        {row.match ? "✓ Same" : "Different"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {others.length > 0 && (
          <details className={styles.others}>
            <summary className={styles.othersTitle}>Also in your closet ({others.length})</summary>
            <div className={styles.similarTrack}>
              {others.map((item) => (
                <div key={item.id} className={styles.similarCard}>
                  <div className={styles.similarImage}>
                    <ItemArt item={item} />
                  </div>
                  {brandOf(item) && <p className={styles.brand}>{brandOf(item)}</p>}
                  <p className={styles.similarName}>{stripBrandPrefix(item.itemName, brandOf(item))}</p>
                  {item.ownedSince && (
                    <p className={styles.similarMeta}>Bought {MONTH_YEAR_FORMAT.format(item.ownedSince)}</p>
                  )}
                  <p className={styles.similarReason}>{similarItemReasons[item.id]}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* 3, 4 & 5 share one form: whichever action button is pressed also
          saves whatever reflection has been filled in, via that button's
          own formAction/name/value (see BuyAnywayButton.tsx and
          src/lib/pauseScreen/reflection.ts). */}
      <form method="POST" className={styles.form}>
        <div className={styles.columns}>
        <section className={`section ${styles.card}`} id="reflection">
          <div className={styles.miniStrip} aria-hidden="true">
            <span className={styles.miniThumb}>
              <ItemArt item={desiredItem} />
            </span>
            <span className={styles.miniNames}>
              {desiredItem.itemName || "This item"}
              {closest ? ` vs ${closest.itemName}` : ""}
            </span>
            {closest && (
              <span className={styles.miniThumb}>
                <ItemArt item={closest} />
              </span>
            )}
          </div>
          <h2 className={styles.cardTitle}>A moment to think</h2>
          <ReflectionSteps
            questions={[
              {
                title: "replaces",
                body: (
                  <div className={styles.question}>
                    <label htmlFor="reflection-replaces" className={styles.questionLabel}>
                      What would this replace?
                    </label>
                    <select
                      id="reflection-replaces"
                      name="reflectionReplaces"
                      className={styles.replaceSelect}
                      defaultValue={replacesDefault}
                    >
                      {!closest && <option value="">Choose one</option>}
                      {replaceOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName}
                        </option>
                      ))}
                      <option value={REFLECTION_NOTHING_VALUE}>Nothing, it&apos;s new to me</option>
                    </select>
                  </div>
                ),
              },
              {
                title: "need",
                body: (
                  <div className={styles.question}>
              <p className={styles.questionLabel}>How much do you need it?</p>
              <div className={styles.scaleRow} role="radiogroup" aria-label="How much do you need it? 1 to 7">
                {NEED_SCALE.map((score) => (
                  <label key={score} className={styles.scaleOption}>
                    <input
                      type="radio"
                      name="reflectionNeedScore"
                      value={score}
                      defaultChecked={reflection?.needScore === score}
                    />
                    <span>{score}</span>
                  </label>
                ))}
              </div>
              <div className={styles.scaleCaption}>
                <span>Not really</span>
                <span>Absolutely</span>
              </div>
            </div>


                ),
              },
              {
                title: "reasons",
                body: (
                  <div className={styles.reflectionForm}>
                <div className={styles.reasonGrid}>
                  <label className={styles.reasonField}>
                    <span className={styles.questionLabel}>One reason for (optional)</span>
                    <input
                      type="text"
                      name="reflectionReasonFor"
                      maxLength={140}
                      placeholder="e.g. I'd wear it every week"
                      defaultValue={reflection?.reasonFor ?? ""}
                    />
                  </label>
                  <label className={styles.reasonField}>
                    <span className={styles.questionLabel}>One reason against (optional)</span>
                    <input
                      type="text"
                      name="reflectionReasonAgainst"
                      maxLength={140}
                      placeholder="e.g. I own something similar"
                      defaultValue={reflection?.reasonAgainst ?? ""}
                    />
                  </label>
                </div>
                <div className={styles.question}>
                  <div className="action-group">
                    <BuildLookButton itemId={desiredItem.id} />
                  </div>
                  {hasLook && <p className={styles.emptyNote}>You have built a look for this one.</p>}
                </div>
                  </div>
                ),
              },
            ]}
            impact={impactStep}
          />
        </section>

        {/* The decision stays in view at every step, so pausing is one press away
            whichever question is showing. */}
        <aside className={styles.decision}>
        {/* Same labels and order as every other screen with these actions. Two
            tiers (Polaris: one primary, the rest quieter): the pause is the
            main choice, with 7 days beside it; Decide later, Let it go and
            Buy anyway are plain text buttons in one row below. */}
        <div className={styles.actions}>
          <div className={styles.actionMain}>
            <button type="submit" formAction={waitAction} name="duration" value="24h" className="btn-primary action">
              Pause for 24 hours
            </button>
            <button type="submit" formAction={waitAction} name="duration" value="7d" className="action">
              Pause for 7 days
            </button>
          </div>
          <p className={styles.actionDivider}>
            <span>Or skip the wait</span>
          </p>
          <div className={styles.actionQuiet}>
            <button type="submit" formAction={resolveAction} name="outcome" value="saved_for_later" className="action action--quiet">
              Decide later
            </button>
            <button type="submit" formAction={resolveAction} name="outcome" value="dropped" className="action action--quiet">
              Let it go
            </button>
            <button type="submit" formAction={resolveAction} name="outcome" value="proceeded" className="action action--quiet">
              Buy anyway
            </button>
          </div>
        </div>
        </aside>
        </div>
      </form>
      </div>
    </div>
  );
}
