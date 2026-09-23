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
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Before you buy: {desiredItem.itemName}</h1>
      {desiredItem.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={desiredItem.imageUrl}
          alt={desiredItem.itemName ?? "Item"}
          width={160}
          height={160}
          style={{ objectFit: "cover", borderRadius: 6, marginBottom: "1rem" }}
        />
      )}
      {desiredItem.price && <p>Price: ${Number(desiredItem.price).toFixed(2)}</p>}

      <h2>What you already own like this</h2>
      {similarItems.length === 0 ? (
        <p>Nothing in your wardrobe looks similar to this one.</p>
      ) : (
        <>
          {redundancyExplanation && <p>{redundancyExplanation}</p>}
          <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: "0.75rem" }}>
            {similarItems.map((item) => (
              <li key={item.id} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.itemName}
                    width={64}
                    height={64}
                    style={{ objectFit: "cover", borderRadius: 6 }}
                  />
                )}
                <span>
                  {item.itemName}
                  {item.ownedSince && ` - owned since ${item.ownedSince.toISOString().slice(0, 10)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Budget impact</h2>
      {budget.hasBudget ? (
        <>
          <p>
            You&apos;ve spent ${budget.spend.toFixed(2)} of your ${budget.budgetAmount.toFixed(2)} budget
            for {budget.monthKey} - ${budget.remaining.toFixed(2)} remaining.
          </p>
          <p>
            Buying this would bring spend to ${budget.spendAfterPurchase.toFixed(2)}, leaving $
            {budget.remainingAfterPurchase.toFixed(2)} remaining.
          </p>
        </>
      ) : (
        <p>
          You haven&apos;t set a budget yet - <a href="/budget">set one</a> to see how this purchase
          would affect it.
        </p>
      )}

      <h2>Take a moment</h2>
      <form action={`/api/desired-items/${desiredItem.id}/wait`} method="POST" style={{ display: "inline-block", marginRight: "1rem" }}>
        <input type="hidden" name="duration" value="24h" />
        <button type="submit">Wait 24 hours</button>
      </form>
      <form action={`/api/desired-items/${desiredItem.id}/wait`} method="POST" style={{ display: "inline-block" }}>
        <input type="hidden" name="duration" value="7d" />
        <button type="submit">Wait 7 days</button>
      </form>

      <p>
        <a href="/">Back to home</a>
      </p>
    </main>
  );
}
