import { prisma } from "@/lib/prisma";
import { assembleRecommendations } from "@/lib/recommendations/assembleRecommendations";
import type { Alternative } from "@/lib/recommendations/postWaitRecommendations";

function AlternativeList({ title, items }: { title: string; items: Alternative[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul>
        {items.map((alt, i) => (
          <li key={i}>
            {alt.name}
            {alt.estimatedPrice !== null && ` - ~$${alt.estimatedPrice.toFixed(2)}`} - {alt.note}
          </li>
        ))}
      </ul>
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
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Still thinking about {desiredItem.itemName}?</h1>

      <h2>Lower-priced alternatives</h2>
      <p style={{ fontStyle: "italic", color: "#555" }}>
        These are AI best guesses, not verified listings - always double-check before buying.
      </p>
      <AlternativeList title="Comparable items" items={comparables} />
      <AlternativeList title="Secondhand options" items={secondhand} />
      {comparables.length === 0 && secondhand.length === 0 && <p>No alternatives to suggest right now.</p>}

      <h2 style={{ marginTop: "1.5rem" }}>Outfit ideas from what you already own</h2>
      {outfitIdeas.length === 0 ? (
        <p>Nothing in your wardrobe pairs obviously with this one yet.</p>
      ) : (
        <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: "0.75rem" }}>
          {outfitIdeas.map((idea, i) => (
            <li key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {idea.wardrobeItem.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={idea.wardrobeItem.imageUrl}
                  alt={idea.wardrobeItem.itemName}
                  width={56}
                  height={56}
                  style={{ objectFit: "cover", borderRadius: 6 }}
                />
              )}
              <span>{idea.suggestion}</span>
            </li>
          ))}
        </ul>
      )}

      <form
        action={`/api/desired-items/${desiredItem.id}/resolve`}
        method="POST"
        style={{ marginTop: "1.5rem" }}
      >
        <input type="hidden" name="outcome" value="saved_for_later" />
        <button type="submit">Save for later instead</button>
      </form>

      <p>
        <a href="/">Back to home</a>
      </p>
    </main>
  );
}
