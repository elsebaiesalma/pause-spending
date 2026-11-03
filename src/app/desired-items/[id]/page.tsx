import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/session";
import { itemStatus, STATUS_BADGE, STATUS_LABEL, type ItemStatus } from "@/lib/considering/itemStatus";
import { getReflectionAnswer } from "@/lib/pauseScreen/reflection";
import { findSimilarWardrobeItems } from "@/lib/tagging/similarity";
import { matchReason } from "@/lib/pauseScreen/matchReason";
import { formatUnlockTime } from "@/lib/dashboard/unlockTime";
import { PageHeader } from "@/components/PageHeader";
import { ItemArt } from "@/components/ItemArt";
import styles from "./item.module.css";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

// Which Decisions tab an item lives in, for the back link.
const TAB_FOR: Record<ItemStatus, string> = {
  draft: "/considering?tab=undecided",
  deciding: "/considering?tab=undecided",
  paused: "/considering",
  undecided: "/considering?tab=undecided",
  let_go: "/considering?tab=let-go",
  bought: "/considering?tab=bought",
  still_want: "/considering?tab=bought",
};

function QuietForm({ action, name, value, label }: { action: string; name?: string; value?: string; label: string }) {
  return (
    <form action={action} method="POST">
      {name && <input type="hidden" name={name} value={value} />}
      <button type="submit" className="btn-quiet">
        {label}
      </button>
    </form>
  );
}

// One page per wanted item (Polaris: every list row opens a detail page). It
// shows the status, what the person said, the closest piece they own, and
// only the actions that make sense for the status right now.
export default async function DesiredItemPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserIdOrRedirect();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const item = await prisma.desiredItem.findFirst({ where: { id, userId } });
  if (!item) notFound();

  const status = itemStatus(item);
  const price = item.price ? Number(item.price) : null;
  const back = { href: TAB_FOR[status], label: "Decisions" };
  const subtitle = [item.brand, price !== null ? `$${price.toFixed(0)}` : null].filter(Boolean).join(" · ") || undefined;

  // While an item is paused, show only its name, brand and when it unlocks:
  // the photo and details would restart the urge the pause is cooling.
  if (status === "paused") {
    return (
      <div className="page">
        <PageHeader back={back} title={item.itemName || "This item"} subtitle={item.brand ?? undefined} />
        <section className={styles.locked}>
          <span className={STATUS_BADGE.paused}>{STATUS_LABEL.paused}</span>
          <p className={styles.lockedText}>
            {item.waitUntil ? `It unlocks ${formatUnlockTime(item.waitUntil)}.` : "It's on pause."} Until then, the
            details stay out of sight.
          </p>
          <div className={styles.actions}>
            <QuietForm action={`/api/desired-items/${item.id}/resolve`} name="outcome" value="dropped" label="Let it go now" />
          </div>
        </section>
      </div>
    );
  }

  const [reflection, similar] = await Promise.all([
    getReflectionAnswer(item.id, userId),
    findSimilarWardrobeItems(userId, { category: item.category, colorFamily: item.colorFamily, styleTags: item.styleTags }),
  ]);
  const closest = similar[0] ?? null;
  const replaced =
    reflection?.replacesWardrobeItemId
      ? await prisma.wardrobeItem.findFirst({
          where: { id: reflection.replacesWardrobeItemId, userId },
          select: { itemName: true },
        })
      : null;

  const pauseHref = `/desired-items/${item.id}/pause`;
  const primary: Record<ItemStatus, { href: string; label: string } | null> = {
    draft: { href: `/desired-items/${item.id}/confirm`, label: "Finish adding it" },
    deciding: { href: pauseHref, label: "Decide now" },
    paused: null,
    undecided: {
      href: item.storeVisitAnswer === "not_sure" ? `/desired-items/${item.id}/still-want-it` : pauseHref,
      label: "Decide now",
    },
    let_go: null,
    bought: null,
    still_want: { href: `/desired-items/${item.id}/still-want-it`, label: "Open Still want it" },
  };
  const action = primary[status];

  return (
    <div className="page">
      <PageHeader
        back={back}
        title={item.itemName || "This item"}
        subtitle={subtitle}
        action={
          action && (
            <Link href={action.href} className="btn btn-primary">
              {action.label}
            </Link>
          )
        }
      />

      <div className={styles.layout}>
        <div className={styles.art}>
          <ItemArt item={item} />
        </div>

        <div className={styles.details}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Status</h2>
            <p className={styles.statusLine}>
              <span className={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</span>
              <span className={styles.muted}>Added {DATE_FORMAT.format(item.createdAt)}</span>
            </p>
            {(status === "undecided" || status === "deciding") && (
              <div className={styles.actions}>
                <QuietForm action={`/api/desired-items/${item.id}/resolve`} name="outcome" value="dropped" label="Let it go" />
              </div>
            )}
            {status === "let_go" && (
              <div className={styles.actions}>
                <QuietForm action={`/api/desired-items/${item.id}/restore`} label="Restore" />
                <QuietForm action={`/api/desired-items/${item.id}/mark-purchased`} label="I bought this after all" />
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>What you said</h2>
            {reflection ? (
              <dl className={styles.answers}>
                {reflection.needScore !== null && (
                  <div>
                    <dt>How much you need it</dt>
                    <dd>{reflection.needScore} out of 7</dd>
                  </div>
                )}
                {(reflection.replacesNothing || replaced) && (
                  <div>
                    <dt>What it would replace</dt>
                    <dd>{reflection.replacesNothing ? "Nothing, it's new to you" : replaced?.itemName}</dd>
                  </div>
                )}
                {reflection.reasonFor && (
                  <div>
                    <dt>One reason for</dt>
                    <dd>{reflection.reasonFor}</dd>
                  </div>
                )}
                {reflection.reasonAgainst && (
                  <div>
                    <dt>One reason against</dt>
                    <dd>{reflection.reasonAgainst}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className={styles.muted}>You haven&apos;t answered the questions for this one.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Closest in your closet</h2>
            {closest ? (
              <div className={styles.closest}>
                <div className={styles.closestArt}>
                  <ItemArt item={closest} />
                </div>
                <div>
                  <p className={styles.closestName}>{closest.itemName}</p>
                  <p className={styles.muted}>{matchReason(item, closest)}</p>
                </div>
              </div>
            ) : (
              <p className={styles.muted}>Nothing like this in your closet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
