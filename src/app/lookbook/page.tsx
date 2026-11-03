import Link from "next/link";
import { requireUserIdOrRedirect } from "@/lib/session";
import { listLooks } from "@/lib/looks/looks";
import { BigNumeral } from "@/components/kit/BigNumeral";
import { PageHero } from "@/components/kit/PageHero";
import { EmptyState } from "@/components/EmptyState";
import { LookCard, type LookCardData } from "./LookCard";
import styles from "./lookbook.module.css";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function LookbookPage() {
  const userId = await requireUserIdOrRedirect();
  const looks = await listLooks(userId);

  const cards: LookCardData[] = looks.map((look) => ({
    id: look.id,
    name: look.name,
    dateLabel: DATE_FORMAT.format(look.createdAt),
    builtInstead: look.builtInstead,
    pieces: look.pieces,
  }));

  return (
    <div className={`page ${styles.page}`}>
      <PageHero eyebrow="Lookbook" title="Something new, from what you own." />

      <div className={styles.top}>
        <BigNumeral label="Looks" value={looks.length} />
        <Link href="/lookbook/board" className={`btn btn-primary ${styles.newLook}`}>
          New look
        </Link>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title="Build your first look"
          action={
            <Link href="/lookbook/board" className="btn btn-primary">
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
