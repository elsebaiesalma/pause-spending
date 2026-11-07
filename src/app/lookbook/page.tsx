import Link from "next/link";
import { requireUserIdOrRedirect } from "@/lib/session";
import { listLooks } from "@/lib/looks/looks";
import { prisma } from "@/lib/prisma";
import { devWardrobeWhere } from "@/lib/devWardrobeView";
import { PageHeader } from "@/components/PageHeader";
import { ClosetTabs } from "@/components/ClosetTabs";
import { EmptyState } from "@/components/EmptyState";
import { LookCard, type LookCardData } from "./LookCard";
import styles from "./lookbook.module.css";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function LookbookPage() {
  const userId = await requireUserIdOrRedirect();
  const [looks, pieceCount] = await Promise.all([
    listLooks(userId),
    prisma.wardrobeItem.count({ where: { userId, status: { not: "returned" }, ...devWardrobeWhere() } }),
  ]);

  const cards: LookCardData[] = looks.map((look) => ({
    id: look.id,
    name: look.name,
    dateLabel: DATE_FORMAT.format(look.createdAt),
    builtInstead: look.builtInstead,
    pieces: look.pieces,
  }));

  return (
    <div className={`page ${styles.page}`}>
      <PageHeader
        title="Closet"
        subtitle="Something new, from what you own."
        action={
          <Link href="/lookbook/board" className="btn btn-primary" data-tour="new-look">
            New look
          </Link>
        }
      />
      <ClosetTabs current="looks" pieces={pieceCount} looks={looks.length} />

      {cards.length === 0 ? (
        <EmptyState
          title="Build your first look"
          action={
            <Link href="/lookbook/board" className="btn btn-primary" data-tour="new-look">
              Start from a suggestion
            </Link>
          }
        >
          No looks yet. Start from a suggestion and rearrange it however you like, using only pieces you own.
        </EmptyState>
      ) : (
        <ul className={styles.grid} role="list">
          {cards.map((card) => (
            <li key={card.id}>
              <LookCard look={card} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
