import Link from "next/link";
import { assembleConsidering } from "@/lib/considering/assembleConsidering";
import { listLetGoItems } from "@/lib/considering/letGoList";
import { listBoughtItems } from "@/lib/considering/boughtList";
import { getKeptPairs } from "@/lib/considering/keptPairs";
import { pauseLengthLabel } from "@/lib/considering/pauseLength";
import { getConsideringMeta } from "@/lib/considering/consideringMeta";
import { parseDecisionsTab, type DecisionsTab } from "@/lib/considering/itemStatus";
import { LocalTime } from "@/components/LocalTime";
import { requireUserIdOrRedirect } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActionToast } from "@/components/ActionToast";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, Tabs } from "@/components/PageHeader";
import { DecisionRow } from "./DecisionRow";
import styles from "./page.module.css";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function savedDaysAgoLabel(days: number): string {
  if (days === 0) return "Undecided since today";
  if (days === 1) return "Undecided for 1 day";
  return `Undecided for ${days} days`;
}

function LetGoButton({ id }: { id: string }) {
  return (
    <form action={`/api/desired-items/${id}/resolve`} method="POST">
      <input type="hidden" name="outcome" value="dropped" />
      <button type="submit" className="btn-quiet">
        Let it go
      </button>
    </form>
  );
}

// Decisions (internally "Considering"): every wanted item, one status each,
// shown as tabs over one list (Polaris). Each tab has its own URL.
export default async function ConsideringPage(props?: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await requireUserIdOrRedirect();
  const params = (await props?.searchParams) ?? {};
  const tab: DecisionsTab = parseDecisionsTab(params.tab);

  const [{ onPause, undecided, saved, letGo }, letGoRows, bought, notDecided] = await Promise.all([
    assembleConsidering(userId),
    listLetGoItems(userId),
    listBoughtItems(userId),
    // Confirmed but left on the pause screen without a choice: still needs a
    // decision, so it belongs in Undecided rather than nowhere.
    prisma.desiredItem.findMany({
      where: { userId, userConfirmed: true, pauseStatus: "pending_confirmation", decisionOutcome: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Only the tab being shown needs these (the let-go pairing reads the closet;
  // the bought badge reads when each pause started).
  const keptPairs = tab === "let-go" ? await getKeptPairs(userId, letGoRows.map((row) => row.item)) : {};
  const boughtMeta = tab === "bought" ? await getConsideringMeta(bought.map((item) => item.id)) : {};

  const counts: Record<DecisionsTab, number> = {
    paused: onPause.length,
    undecided: undecided.length + saved.length + notDecided.length,
    "let-go": letGoRows.length,
    bought: bought.length,
  };
  const tabs: { key: DecisionsTab; label: string }[] = [
    { key: "paused", label: "On pause" },
    { key: "undecided", label: "Undecided" },
    { key: "let-go", label: "Let go" },
    { key: "bought", label: "Bought" },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Decisions"
        subtitle="Everything you've paused, and where each one landed."
      />
      <Tabs
        label="Decisions"
        items={tabs.map((t) => ({
          href: t.key === "paused" ? "/considering" : `/considering?tab=${t.key}`,
          label: t.label,
          count: counts[t.key],
          current: t.key === tab,
        }))}
      />
      <ActionToast />

      {tab === "paused" &&
        (onPause.length === 0 ? (
          <EmptyState
            title="Nothing on pause right now"
            action={
              <Link href="/desired-items/new" className="btn">
                Pause a purchase
              </Link>
            }
          >
            When something catches your eye, pause it here before you buy. The urge usually fades within a day.
          </EmptyState>
        ) : (
          <div className={styles.list}>
            {onPause.map(({ item, pausedAt, reflectionSummary }) => {
              return (
                <DecisionRow
                  key={item.id}
                  item={item}
                  meta={
                    <>
                      Paused <LocalTime iso={pausedAt.toISOString()} kind="date" />
                      {item.waitUntil && (
                        <>
                          {" · "}
                          <LocalTime iso={item.waitUntil.toISOString()} kind="unlock" />
                        </>
                      )}
                    </>
                  }
                  note={reflectionSummary}
                  actions={<LetGoButton id={item.id} />}
                />
              );
            })}
          </div>
        ))}

      {tab === "undecided" &&
        (counts.undecided === 0 ? (
          <EmptyState title="Nothing undecided">
            Items land here when a pause ends, when you choose Decide later, or when you leave a store without
            deciding.
          </EmptyState>
        ) : (
          <div className={styles.list}>
            {undecided.map(({ item, wentToStoreAt }) => (
              <DecisionRow
                key={item.id}
                item={item}
                meta={`Went to the store ${DATE_FORMAT.format(wentToStoreAt)}`}
                actions={
                  <a href={`/desired-items/${item.id}/still-want-it`} className="btn-quiet">
                    Decide now
                  </a>
                }
              />
            ))}
            {notDecided.map((item) => (
              <DecisionRow
                key={item.id}
                item={item}
                meta={`Added ${DATE_FORMAT.format(item.createdAt)}`}
                actions={
                  <>
                    <a href={`/desired-items/${item.id}/pause`} className="btn-quiet">
                      Decide now
                    </a>
                    <LetGoButton id={item.id} />
                  </>
                }
              />
            ))}
            {saved.map(({ item, savedDaysAgo, pauseEndedAt, reflectionSummary }) => (
              <DecisionRow
                key={item.id}
                item={item}
                meta={pauseEndedAt ? `Pause ended ${DATE_FORMAT.format(pauseEndedAt)}` : savedDaysAgoLabel(savedDaysAgo)}
                note={reflectionSummary}
                actions={
                  <>
                    <a href={`/desired-items/${item.id}/pause`} className="btn-quiet">
                      Decide now
                    </a>
                    <LetGoButton id={item.id} />
                  </>
                }
              />
            ))}
          </div>
        ))}

      {tab === "let-go" && (
        <>
          <div className={styles.totals}>
            <div>
              <div className={styles.totalValue}>${letGo.totalKept.toFixed(0)}</div>
              <p className={styles.totalLabel}>
                saved by letting {letGo.itemsLetGo} {letGo.itemsLetGo === 1 ? "thing" : "things"} go
              </p>
            </div>
          </div>
          {letGoRows.length === 0 ? (
            <EmptyState title="Nothing let go yet">
              Things you decide against end up here, with the money you saved by not buying them.
            </EmptyState>
          ) : (
            <div className={styles.list}>
              {letGoRows.map(({ item, automatic }) => (
                <DecisionRow
                  key={item.id}
                  item={item}
                  meta={automatic ? "Moved automatically after 60 days" : undefined}
                  kept={keptPairs[item.id]}
                  note={keptPairs[item.id] ? undefined : "Would have been new to your closet"}
                  actions={
                    <>
                      <form action={`/api/desired-items/${item.id}/restore`} method="POST">
                        <button type="submit" className="btn-quiet">
                          Restore
                        </button>
                      </form>
                      <form action={`/api/desired-items/${item.id}/mark-purchased`} method="POST">
                        <button type="submit" className="btn-quiet">
                          I bought this after all
                        </button>
                      </form>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "bought" &&
        (bought.length === 0 ? (
          <EmptyState title="Nothing bought through PAUSE yet">
            When you decide something is worth it, it lands here. Buying after a pause is a decision too.
          </EmptyState>
        ) : (
          <>
            <p className={styles.intro}>Buying something you thought through is a good decision too.</p>
            <div className={styles.list}>
              {bought.map((item) => {
                const pausedAt = boughtMeta[item.id]?.pausedAt ?? null;
                return (
                  <DecisionRow
                    key={item.id}
                    item={item}
                    badge={
                      pausedAt
                        ? { label: "✓ Bought after a pause", className: "badge badge--success" }
                        : { label: "Bought", className: "badge badge--neutral" }
                    }
                    meta={pauseLengthLabel(pausedAt, item.waitUntil) ?? (pausedAt ? undefined : "Bought without a pause")}
                    actions={
                      <form action={`/api/desired-items/${item.id}/resolve`} method="POST">
                        <input type="hidden" name="outcome" value="dropped" />
                        <button type="submit" className="btn-quiet">
                          Mark as returned
                        </button>
                      </form>
                    }
                  />
                );
              })}
            </div>
          </>
        ))}
    </div>
  );
}
