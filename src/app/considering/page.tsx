import { assembleConsidering } from "@/lib/considering/assembleConsidering";
import { formatUnlockTime } from "@/lib/dashboard/unlockTime";
import { requireUserIdOrRedirect } from "@/lib/session";
import { ActionToast } from "@/components/ActionToast";
import { EmptyState } from "@/components/EmptyState";
import styles from "./page.module.css";

const PAUSED_DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function savedDaysAgoLabel(days: number): string {
  if (days === 0) return "Undecided since today";
  if (days === 1) return "Undecided for 1 day";
  return `Undecided for ${days} days`;
}

export default async function ConsideringPage() {
  const userId = await requireUserIdOrRedirect();
  const { onPause, undecided, saved, letGo } = await assembleConsidering(userId);

  return (
    <div className="page">
      <span className="page__eyebrow">Considering</span>
      <h1>What you&apos;re thinking about</h1>
      <ActionToast />

      <section className="section">
        <h2 className={styles.sectionTitle}>
          On pause <span className="badge badge--neutral">{onPause.length}</span>
        </h2>
        {onPause.length === 0 ? (
          <EmptyState
            title="Nothing on pause right now"
            action={
              <a href="/desired-items/new" className="btn btn-primary">
                Pause a purchase
              </a>
            }
          >
            When something catches your eye, pause it here before you buy. The urge usually fades within a day.
          </EmptyState>
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
                    <span className="badge badge--success">Paused</span>
                    <span>
                      Paused {PAUSED_DATE_FORMAT.format(pausedAt)}
                      {unlockLabel ? ` · ${unlockLabel}` : ""}
                    </span>
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
          <h2 className={styles.sectionTitle}>
            Went to the store <span className="badge badge--neutral">{undecided.length}</span>
          </h2>
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
                    <span className="badge badge--neutral">Went to the store</span>
                    <span>Visited {PAUSED_DATE_FORMAT.format(wentToStoreAt)}</span>
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
        <h2 className={styles.sectionTitle}>
          Undecided <span className="badge badge--neutral">{saved.length}</span>
        </h2>
        {saved.length === 0 ? (
          <p className={styles.emptyNote}>Nothing undecided. Items land here when a pause ends or you choose Decide later.</p>
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
                    <span className="badge">Undecided</span>
                    <span>
                      {pauseEndedAt ? `Pause ended ${PAUSED_DATE_FORMAT.format(pauseEndedAt)}` : savedDaysAgoLabel(savedDaysAgo)}
                    </span>
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
        <h2 className={styles.sectionTitle}>Let go</h2>
        <div className={styles.totals}>
          <div>
            <div className={styles.totalValue}>{letGo.itemsLetGo}</div>
            <p className={styles.totalLabel}>item{letGo.itemsLetGo === 1 ? "" : "s"} let go</p>
          </div>
          <div>
            <div className={styles.totalValue}>${letGo.totalKept.toFixed(0)}</div>
            <p className={styles.totalLabel}>saved</p>
          </div>
        </div>
        <a href="/considering/let-go" className="link section" style={{ display: "inline-block" }}>
          See what you let go
        </a>
      </section>
    </div>
  );
}
