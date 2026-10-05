import { notFound } from "next/navigation";
import { assemblePauseScreen } from "@/lib/pauseScreen/assemblePauseScreen";
import { requireUserIdOrRedirect } from "@/lib/session";
import { isRecordNotFoundError } from "@/lib/prismaErrors";
import { REFLECTION_NOTHING_VALUE } from "@/lib/pauseScreen/reflectionForm";
import { ColorDot } from "@/components/ColorDot";
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

  const price = desiredItem.price ? Number(desiredItem.price) : null;
  const waitAction = `/api/desired-items/${desiredItem.id}/wait`;
  const resolveAction = `/api/desired-items/${desiredItem.id}/resolve`;

  return (
    <div className="page">
      <span className="page__eyebrow">Before you buy</span>

      {/* 1. The wanted item */}
      <div className={styles.wantedItem}>
        <div className={styles.wantedImage}>
          {desiredItem.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={desiredItem.imageUrl} alt={desiredItem.itemName ?? "Item"} />
          ) : (
            <div className={styles.wantedPlaceholder}>
              <span className={styles.wantedPlaceholderLabel}>{desiredItem.category || "Item"}</span>
            </div>
          )}
        </div>
        <div className={styles.wantedDetails}>
          {desiredItem.brand && <p className={styles.brand}>{desiredItem.brand}</p>}
          <h1>{desiredItem.itemName || "This item"}</h1>
          <div className={styles.metaLine}>
            <ColorDot colorFamily={desiredItem.colorFamily} />
            {desiredItem.colorName && <span>{desiredItem.colorName}</span>}
            {desiredItem.category && <span>{desiredItem.category}</span>}
            <span>{price !== null ? `$${price.toFixed(0)}` : "Price not set"}</span>
          </div>
        </div>
      </div>

      {/* 2. Already in your wardrobe */}
      <section className="section">
        <p className={styles.sectionLabel}>01 / Already in your wardrobe</p>
        {similarItems.length === 0 ? (
          <p className={styles.emptyNote}>Nothing like this in your wardrobe.</p>
        ) : (
          <div className={styles.similarTrack}>
            {similarItems.map((item) => (
              <div key={item.id} className={styles.similarCard}>
                <div className={styles.similarImage}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.itemName} />
                  ) : null}
                </div>
                <p className={styles.similarName}>{item.itemName}</p>
                {item.ownedSince && (
                  <p className={styles.similarMeta}>bought {MONTH_YEAR_FORMAT.format(item.ownedSince)}</p>
                )}
                <p className={styles.similarReason}>{similarItemReasons[item.id]}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3, 4 & 5 share one form: whichever action button is pressed also
          saves whatever reflection has been filled in, via that button's
          own formAction/name/value (see BuyAnywayButton.tsx and
          src/lib/pauseScreen/reflection.ts). */}
      <form method="POST">
        <section className="section" id="reflection">
          <p className={styles.sectionLabel}>02 / A moment to think</p>
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
          </div>
        </section>

        {/* 4. This month */}
        <section className={`section ${styles.budgetSection}`}>
          <p className={styles.sectionLabel}>03 / This month</p>
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

        {/* 5. Actions */}
        <div className={styles.actions}>
          <button type="submit" formAction={waitAction} name="duration" value="24h" className="btn-primary">
            Pause for 24 hours
          </button>
          <button type="submit" formAction={waitAction} name="duration" value="7d" className={styles.secondaryPauseOption}>
            Pause for 7 days instead
          </button>
          <button type="submit" formAction={resolveAction} name="outcome" value="dropped" className="btn">
            Let it go
          </button>
          <BuyAnywayButton formAction={resolveAction} alreadyAnswered={reflection !== null} />
        </div>
      </form>
    </div>
  );
}
