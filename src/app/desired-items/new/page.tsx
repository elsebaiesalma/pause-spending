import { requireUserIdOrRedirect } from "@/lib/session";
import SearchBox from "./SearchBox";

export default async function NewDesiredItemPage() {
  await requireUserIdOrRedirect();
  const searchAvailable = Boolean(process.env.BRAVE_SEARCH_API_KEY);

  return (
    <div className="page">
      <span className="page__eyebrow">Before you buy</span>
      <h1>I want to buy this</h1>

      <div className="item-entry-flow">
        {searchAvailable && (
          <div className="item-entry-flow__search">
            <SearchBox />
          </div>
        )}

        <div className="item-entry-flow__url">
          <h2>Paste a product URL</h2>
          <form action="/api/desired-items/from-url" method="POST">
            <input name="url" type="url" placeholder="https://..." required />
            <button type="submit">Look it up</button>
          </form>
        </div>

        {/* DOM order matches desktop's default appearance (URL paste
            first); CSS promotes this section ahead of URL paste on mobile
            only (see globals.css) - it's the reliable path for exactly the
            retailers search and direct-fetch extraction handle worst
            (heavy anti-bot blocking), so on the viewport where a
            screenshot is also just easier to take, it shouldn't be buried
            below a form likely to fail into a low-confidence guess for
            those same retailers. */}
        <div className="item-entry-flow__screenshot">
          <h2>Upload a screenshot</h2>
          <form action="/api/desired-items/from-screenshot" method="POST" encType="multipart/form-data">
            <input name="screenshot" type="file" accept="image/*" required />
            <button type="submit">Identify item</button>
          </form>
        </div>

        <div className="item-entry-flow__text">
          <h2>Or just type it</h2>
          <form action="/api/desired-items/from-text" method="POST">
            <input name="text" placeholder="e.g. navy wool blazer" required />
            <button type="submit" className="btn-primary">
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
