import { listActiveWardrobeItems } from "@/lib/wardrobe";
import { requireUserIdOrRedirect } from "@/lib/session";

const PREVIEW_COUNT = 6;

export default async function GmailSyncDonePage() {
  const userId = await requireUserIdOrRedirect();
  const items = await listActiveWardrobeItems(userId);
  const preview = items.slice(0, PREVIEW_COUNT);

  return (
    <div className="page">
      <span className="page__eyebrow">Closet ready</span>
      <h1>{items.length > 0 ? "Here's what we found" : "Nothing matched yet"}</h1>
      <p className="page__lede">
        {items.length > 0
          ? `${items.length} item${items.length === 1 ? "" : "s"} in your closet so far, built from your order confirmations.`
          : "No order confirmations matched clothing, shoes, or accessories in the last six months. You can add items by hand any time from your closet."}
      </p>

      {preview.length > 0 && (
        <div className="section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: "0.75rem" }}>
          {preview.map((item) => (
            <div key={item.id} className="stack--tight">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.itemName}
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "1px", background: "var(--color-bg-alt)" }}
                />
              ) : (
                <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--color-bg-alt)", borderRadius: "1px" }} />
              )}
              <span className="item-row__meta" style={{ fontSize: "0.75rem" }}>
                {item.itemName}
              </span>
            </div>
          ))}
        </div>
      )}

      <a href="/dashboard" className="btn btn-primary section">
        Continue to dashboard
      </a>
    </div>
  );
}
