import { requireUserIdOrRedirect } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import SearchBox from "./SearchBox";
import { AddItem } from "@/components/AddItem";

export default async function NewDesiredItemPage({ searchParams }: PageProps<"/desired-items/new">) {
  await requireUserIdOrRedirect();
  // Home's smart add hands typed text over here, so the matches list opens already searching.
  const { q } = await searchParams;
  const initialQuery = typeof q === "string" ? q : "";
  const searchAvailable = Boolean(process.env.BRAVE_SEARCH_API_KEY);

  return (
    <div className="page page--narrow">
      <PageHeader title="Pause a purchase" subtitle="Add what caught your eye. You'll see it next to your closet before deciding." />

      {/* Typed text with search configured lands here as ?q= and lists the
          matches; otherwise one box takes a link or a name, and the zone
          under it takes a screenshot (the same box as Home). */}
      {searchAvailable && initialQuery ? (
        <div className="item-entry-flow__search">
          <SearchBox initialQuery={initialQuery} />
        </div>
      ) : (
        <AddItem searchAvailable={searchAvailable} />
      )}
    </div>
  );
}
