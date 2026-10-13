import { assembleConsidering } from "@/lib/considering/assembleConsidering";
import { formatUnlockTime } from "@/lib/dashboard/unlockTime";
import { requireUserIdOrRedirect } from "@/lib/session";
import styles from "./page.module.css";

const PAUSED_DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function savedDaysAgoLabel(days: number): string {
  if (days === 0) return "Saved today";
  if (days === 1) return "Saved 1 day ago";
  return `Saved ${days} days ago`;
}

export default async function ConsideringPage() {
  const userId = await requireUserIdOrRedirect();
  const { onPause, undecided, saved, letGo } = await assembleConsidering(userId);

  return (
    <div className="page">
      <span className="page__eyebrow">Considering</span>
      <h1>What you&apos;re thinking about</h1>

      <section className="section">
        <p className={styles.sectionLabel}>01 / On pause</p>
        {onPause.length === 0 ? (
          <p className={styles.emptyNote}>Nothing on pause right now.</p>
        ) : (
          <div>
            {onPause.map(({ item, pausedAt, reflectionSummary }) => {
              const price = item.price ? Number(item.price) : null;
              const unlockLabel = item.waitUntil ? formatUnlockTime(item.waitUntil) : null;
              return (
                <div key={item.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div>
                      {item.brand && <p className={styles.rowBrand}>{item.brand}</p>}
                      <p className={styles.rowName}>{item.itemName || "Untitled item"}</p>
                    </div>
                    {price !== null && <span className={styles.rowPrice}>${price.toFixed(0)}</span>}
                  </div>
                  <p className={styles.rowMeta}>
                    Paused {PAUSED_DATE_FORMAT.format(pausedAt)}
                    {unlockLabel ? ` · ${unlockLabel}` : ""}
                  </p>
                  {reflectionSummary && <p className={styles.rowReflection}>{reflectionSummary}</p>}
                  <div className={styles.rowActions}>
                    <form action={`/api/desired-items/${item.id}/resolve`} method="POST">
                      <input type="hidden" name="outcome" value="dropped" />
                      <button type="submit" className="btn-quiet">Let it go</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {undecided.length > 0 && (
        <section className="section">
          <p className={styles.sectionLabel}>02 / Went to the store</p>
          <div>
            {undecided.map(({ item, wentToStoreAt }) => {
              const price = item.price ? Number(item.price) : null;
              return (
                <div key={item.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div>
                      {item.brand && <p className={styles.rowBrand}>{item.brand}</p>}
                      <p className={styles.rowName}>{item.itemName || "Untitled item"}</p>
                    </div>
                    {price !== null && <span className={styles.rowPrice}>${price.toFixed(0)}</span>}
                  </div>
                  <p className={styles.rowMeta}>
                    Went to the store, undecided · visited {PAUSED_DATE_FORMAT.format(wentToStoreAt)}
                  </p>
                  <div className={styles.rowActions}>
                    <a href={`/desired-items/${item.id}/still-want-it`} className="btn-quiet">Decide now</a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="section">
        <p className={styles.sectionLabel}>03 / Saved for later</p>
        {saved.length === 0 ? (
          <p className={styles.emptyNote}>Nothing saved for later.</p>
        ) : (
          <div>
            {saved.map(({ item, savedDaysAgo, pauseEndedAt, reflectionSummary }) => {
              const price = item.price ? Number(item.price) : null;
              return (
                <div key={item.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div>
                      {item.brand && <p className={styles.rowBrand}>{item.brand}</p>}
                      <p className={styles.rowName}>{item.itemName || "Untitled item"}</p>
                    </div>
                    {price !== null && <span className={styles.rowPrice}>${price.toFixed(0)}</span>}
                  </div>
                  <p className={styles.rowMeta}>
                    {pauseEndedAt ? `Pause ended ${PAUSED_DATE_FORMAT.format(pauseEndedAt)}` : savedDaysAgoLabel(savedDaysAgo)}
                  </p>
                  {reflectionSummary && <p className={styles.rowReflection}>{reflectionSummary}</p>}
                  <div className={styles.rowActions}>
                    <form action={`/api/desired-items/${item.id}/resolve`} method="POST">
                      <input type="hidden" name="outcome" value="dropped" />
                      <button type="submit" className="btn-quiet">Let it go</button>
                    </form>
                    <a href={`/desired-items/${item.id}/pause`} className="btn-quiet">Decide now</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <p className={styles.sectionLabel}>04 / Let go</p>
        <div className={styles.totals}>
          <div>
            <div className={styles.totalValue}>{letGo.itemsLetGo}</div>
            <p className={styles.totalLabel}>item{letGo.itemsLetGo === 1 ? "" : "s"} let go</p>
          </div>
          <div>
            <div className={styles.totalValue}>${letGo.totalKept.toFixed(0)}</div>
            <p className={styles.totalLabel}>kept</p>
          </div>
        </div>
        <a href="/considering/let-go" className="link section" style={{ display: "inline-block" }}>
          See what you let go
        </a>
      </section>
    </div>
  );
}
