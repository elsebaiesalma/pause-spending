import { listLetGoItems } from "@/lib/considering/letGoList";
import { requireUserIdOrRedirect } from "@/lib/session";
import { DashboardTopNav, DashboardBottomTabBar } from "@/app/dashboard/DashboardNav";
import styles from "../page.module.css";

export default async function LetGoListPage() {
  const userId = await requireUserIdOrRedirect();
  const rows = await listLetGoItems(userId);

  return (
    <div className="page page--wide">
      <DashboardTopNav active="considering" />

      <span className="page__eyebrow">Considering</span>
      <h1>What you let go</h1>

      {rows.length === 0 ? (
        <p className={`${styles.emptyNote} section`}>Nothing let go yet.</p>
      ) : (
        <div className="section">
          {rows.map(({ item, automatic }) => {
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
                {automatic && <p className={styles.rowAutoTag}>Moved automatically</p>}
                <div className={styles.rowActions}>
                  <form action={`/api/desired-items/${item.id}/mark-purchased`} method="POST">
                    <button type="submit">I bought this after all</button>
                  </form>
                  <form action={`/api/desired-items/${item.id}/restore`} method="POST">
                    <button type="submit">Restore</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DashboardBottomTabBar active="considering" />
    </div>
  );
}
