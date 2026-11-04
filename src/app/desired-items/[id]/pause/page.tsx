import { notFound } from "next/navigation";
import { assemblePauseScreen } from "@/lib/pauseScreen/assemblePauseScreen";
import { requireUserIdOrRedirect } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { REFLECTION_NOTHING_VALUE } from "@/lib/pauseScreen/reflectionForm";
import { ColorDot } from "@/components/ColorDot";
import { ItemArt } from "@/components/ItemArt";
import { hasLookForDesiredItem } from "@/lib/looks/looks";
import { hasReflectionAnswer } from "@/lib/pauseScreen/reflectionGate";
import { compareAttributes, similarityBand } from "@/lib/pauseScreen/attributeMatch";
import { BuildLookButton } from "./BuildLookButton";
import { BuyAnywayButton } from "./BuyAnywayButton";
import styles from "./page.module.css";

const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const NEED_SCALE = [1, 2, 3, 4, 5, 6, 7];

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

  // The closest owned piece goes side by side with the wanted one; the
  // rest are listed below it. "Closest" is the database's own order, since
  // matching is rule-based and has no finer ranking.
  const [closest, ...others] = similarItems;
  const rows = closest ? compareAttributes(desiredItem, closest) : [];

  return (
    <div className="page">
      <span className="page__eyebrow">Before you buy</span>

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
              <p className={styles.compareName}>{closest.itemName}</p>
              {closest.ownedSince && (
                <p className={styles.metaLine}>Bought {MONTH_YEAR_FORMAT.format(closest.ownedSince)}</p>
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
          <div className={styles.others}>
            <h2 className={styles.othersTitle}>Also in your closet</h2>
            <div className={styles.similarTrack}>
              {others.map((item) => (
                <div key={item.id} className={styles.similarCard}>
                  <div className={styles.similarImage}>
                    <ItemArt item={item} />
                  </div>
                  <p className={styles.similarName}>{item.itemName}</p>
                  {item.ownedSince && (
                    <p className={styles.similarMeta}>Bought {MONTH_YEAR_FORMAT.format(item.ownedSince)}</p>
                  )}
                  <p className={styles.similarReason}>{similarItemReasons[item.id]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3, 4 & 5 share one form: whichever action button is pressed also
          saves whatever reflection has been filled in, via that button's
          own formAction/name/value (see BuyAnywayButton.tsx and
          src/lib/pauseScreen/reflection.ts). */}
      <form method="POST" className={styles.form}>
        <div className={styles.columns}>
        <section className={`section ${styles.card}`} id="reflection">
          <h2 className={styles.cardTitle}>A moment to think</h2>
          <div className={styles.reflectionForm}>
            <div className={styles.question}>
              <p className={styles.questionLabel}>What would this replace?</p>
              <div className={styles.chipRow} role="radiogroup" aria-label="What would this replace?">
                {similarItems.map((item) => (
                  <label key={item.id} className={styles.chipOption}>
                    <input
                      type="radio"
                      name="reflectionReplaces"
                      value={item.id}
                      defaultChecked={reflection?.replacesWardrobeItemId === item.id}
                    />
                    <span>{item.itemName}</span>
                  </label>
                ))}
                <label className={styles.chipOption}>
                  <input
                    type="radio"
                    name="reflectionReplaces"
                    value={REFLECTION_NOTHING_VALUE}
                    defaultChecked={reflection?.replacesNothing ?? false}
                  />
                  <span>Nothing, it&apos;s new to me</span>
                </label>
              </div>
            </div>

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

            <div className={styles.question}>
              <div className={styles.reasonGrid}>
                <label className={styles.reasonField}>
                  <span className={styles.questionLabel}>One reason for</span>
                  <input
                    type="text"
                    name="reflectionReasonFor"
                    maxLength={140}
                    placeholder="Optional"
                    defaultValue={reflection?.reasonFor ?? ""}
                  />
                </label>
                <label className={styles.reasonField}>
                  <span className={styles.questionLabel}>One reason against</span>
                  <input
                    type="text"
                    name="reflectionReasonAgainst"
                    maxLength={140}
                    placeholder="Optional"
                    defaultValue={reflection?.reasonAgainst ?? ""}
                  />
                </label>
              </div>
            </div>

            <div className={styles.question}>
              <p className={styles.questionLabel}>Or picture it with what you own</p>
              <div className="action-group">
                <BuildLookButton itemId={desiredItem.id} />
              </div>
              {hasLook && <p className={styles.emptyNote}>You have built a look for this one.</p>}
            </div>
          </div>
        </section>

        {/* 4. This month */}
        <section className={`section ${styles.card} ${styles.budgetSection}`}>
          <h2 className={styles.cardTitle}>This month</h2>
          {!budget.hasBudget ? (
            <p className={styles.emptyNote}>
              No plan set yet -{" "}
              <a href="/budget" className="link">
                set one
              </a>{" "}
              to see how this affects it.
            </p>
          ) : !budget.priceKnown ? (
            <p className={styles.emptyNote}>
              This item has no price yet, so its effect on your plan can&apos;t be shown. Spent so far this month: $
              {budget.spend.toFixed(0)} of ${budget.budgetAmount.toFixed(0)}.
            </p>
          ) : (
            <>
              <div className={styles.budgetBar}>
                <div
                  className={styles.budgetBarProjected}
                  style={{ width: `${Math.min(100, (budget.spendAfterPurchase / budget.budgetAmount) * 100)}%` }}
                />
                <div
                  className={styles.budgetBarSpend}
                  style={{ width: `${Math.min(100, (budget.spend / budget.budgetAmount) * 100)}%` }}
                />
              </div>
              <p className={styles.budgetLine}>
                ${budget.spend.toFixed(0)} of ${budget.budgetAmount.toFixed(0)} → $
                {budget.spendAfterPurchase.toFixed(0)} if you buy this
              </p>
              <p className={styles.budgetPercent}>
                This is {Math.round(((budget.spendAfterPurchase - budget.spend) / budget.budgetAmount) * 100)}% of
                your monthly plan
              </p>
              {budget.spendAfterPurchase > budget.budgetAmount && (
                <p className={styles.overPlan}>
                  ${(budget.spendAfterPurchase - budget.budgetAmount).toFixed(0)} over your plan
                </p>
              )}
            </>
          )}
        </section>

        </div>

        {/* 5. Actions */}
        {/* Same labels and order as every other screen with these actions. Three
            tiers: the pause is the main choice; Decide later and Let it go sit
            below as smaller outlined buttons; Buy anyway stays possible but is the
            quietest choice, on its own line. */}
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
            <span>or decide now</span>
          </p>
          <div className={styles.actionSecond}>
            <button type="submit" formAction={resolveAction} name="outcome" value="saved_for_later" className="action">
              Decide later
            </button>
            <button type="submit" formAction={resolveAction} name="outcome" value="dropped" className="action">
              Let it go
            </button>
          </div>
          <div className={styles.actionBuy}>
            <BuyAnywayButton formAction={resolveAction} alreadyAnswered={hasReflectionAnswer(reflection, hasLook)} />
          </div>
        </div>
      </form>
    </div>
  );
}
