import { prisma } from "@/lib/prisma";
import { assemblePauseScreen } from "@/lib/pauseScreen/assemblePauseScreen";

export default async function PauseScreenPage({ params }: PageProps<"/desired-items/[id]/pause">) {
  const { id } = await params;
  const user = await prisma.user.findFirstOrThrow();
  const { desiredItem, similarItems, redundancyExplanation, budget } = await assemblePauseScreen(
    user.id,
    id
  );

  return (
    <div className="page">
      <span className="page__eyebrow">Before you buy</span>
      <h1>{desiredItem.itemName}</h1>
      {desiredItem.price && (
        <p className="item-row__price" style={{ marginTop: "0.35rem" }}>
          ${Number(desiredItem.price).toFixed(2)}
        </p>
      )}
      {desiredItem.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={desiredItem.imageUrl}
          alt={desiredItem.itemName ?? "Item"}
          width={220}
          height={220}
          style={{ objectFit: "cover", marginTop: "1.25rem" }}
        />
      )}

      <h2>What you already own like this</h2>
      {similarItems.length === 0 ? (
        <p className="page__lede">Nothing in your wardrobe looks similar to this one.</p>
      ) : (
        <>
          {redundancyExplanation && (
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "1.2rem",
                lineHeight: 1.5,
                color: "var(--color-ink)",
                borderLeft: "2px solid var(--color-blush)",
                paddingLeft: "var(--space-3)",
                margin: "var(--space-2) 0 var(--space-4)",
                maxWidth: "44ch",
              }}
            >
              {redundancyExplanation}
            </p>
          )}
          <div>
            {similarItems.map((item) => (
              <div key={item.id} className="item-row">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.itemName} className="item-row__thumb" />
                ) : (
                  <div className="item-row__thumb" />
                )}
                <div className="item-row__body">
                  <div className="item-row__title">{item.itemName}</div>
                  {item.ownedSince && (
                    <div className="item-row__meta">owned since {item.ownedSince.toISOString().slice(0, 10)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Budget impact</h2>
      {budget.hasBudget ? (
        <div className="stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Spent this month of ${budget.budgetAmount.toFixed(2)}</span>
            <strong>${budget.spend.toFixed(2)}</strong>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>After this purchase</span>
            <strong>${budget.spendAfterPurchase.toFixed(2)}</strong>
          </div>
          <hr className="divider" style={{ margin: "0.5rem 0" }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Remaining for {budget.monthKey}</span>
            <strong>${budget.remainingAfterPurchase.toFixed(2)}</strong>
          </div>
        </div>
      ) : (
        <p className="page__lede">
          You haven&apos;t set a budget yet -{" "}
          <a href="/budget" className="link">
            set one
          </a>{" "}
          to see how this purchase would affect it.
        </p>
      )}

      <h2>Take a moment</h2>
      <div className="row">
        <form action={`/api/desired-items/${desiredItem.id}/wait`} method="POST">
          <input type="hidden" name="duration" value="24h" />
          <button type="submit" className="btn-primary">
            Wait 24 hours
          </button>
        </form>
        <form action={`/api/desired-items/${desiredItem.id}/wait`} method="POST">
          <input type="hidden" name="duration" value="7d" />
          <button type="submit" className="btn-primary">
            Wait 7 days
          </button>
        </form>
        <form action={`/api/desired-items/${desiredItem.id}/resolve`} method="POST">
          <input type="hidden" name="outcome" value="proceeded" />
          <button type="submit">I still want this</button>
        </form>
        <form action={`/api/desired-items/${desiredItem.id}/resolve`} method="POST">
          <input type="hidden" name="outcome" value="saved_for_later" />
          <button type="submit">Save for later</button>
        </form>
      </div>
    </div>
  );
}
