import { prisma } from "@/lib/prisma";
import { assembleRecommendations } from "@/lib/recommendations/assembleRecommendations";
import type { Alternative } from "@/lib/recommendations/postWaitRecommendations";

function AlternativeList({ title, items }: { title: string; items: Alternative[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <h3 className="tag" style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-1)" }}>
        {title}
      </h3>
      <div>
        {items.map((alt, i) => (
          <p key={i} className="page__lede" style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--color-ink)" }}>{alt.name}</strong>
            {alt.estimatedPrice !== null && ` - ~$${alt.estimatedPrice.toFixed(2)}`} - {alt.note}
          </p>
        ))}
      </div>
    </>
  );
}

export default async function RecommendationsPage({
  params,
}: PageProps<"/desired-items/[id]/recommendations">) {
  const { id } = await params;
  const user = await prisma.user.findFirstOrThrow();
  const { desiredItem, comparables, secondhand, outfitIdeas } = await assembleRecommendations(
    user.id,
    id
  );

  return (
    <div className="page">
      <span className="page__eyebrow">Still deciding</span>
      <h1>Still thinking about {desiredItem.itemName}?</h1>

      <h2>Lower-priced alternatives</h2>
      <p className="note" style={{ fontStyle: "italic" }}>
        These are AI best guesses, not verified listings - always double-check before buying.
      </p>
      <AlternativeList title="Comparable items" items={comparables} />
      <AlternativeList title="Secondhand options" items={secondhand} />
      {comparables.length === 0 && secondhand.length === 0 && (
        <p className="page__lede">No alternatives to suggest right now.</p>
      )}

      <h2>Outfit ideas from what you already own</h2>
      {outfitIdeas.length === 0 ? (
        <p className="page__lede">Nothing in your wardrobe pairs obviously with this one yet.</p>
      ) : (
        <div>
          {outfitIdeas.map((idea, i) => (
            <div key={i} className="item-row">
              {idea.wardrobeItem.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={idea.wardrobeItem.imageUrl} alt={idea.wardrobeItem.itemName} className="item-row__thumb" />
              )}
              <span>{idea.suggestion}</span>
            </div>
          ))}
        </div>
      )}

      <form action={`/api/desired-items/${desiredItem.id}/resolve`} method="POST" className="section">
        <input type="hidden" name="outcome" value="saved_for_later" />
        <button type="submit" className="btn-primary">
          Save for later instead
        </button>
      </form>
    </div>
  );
}
