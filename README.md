This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Gmail integration

This app connects to Gmail via OAuth (`gmail.readonly`) to read receipt emails. Two things to know
before deploying this anywhere beyond local development:

- **The Google OAuth app runs in Testing mode**, which caps it at 100 test users (added manually in
  the Google Cloud Console) and requires re-consenting periodically per Google's testing-mode token
  lifetime.
- **`gmail.readonly` is a Google-restricted scope.** Moving the OAuth app out of Testing mode into
  Production for real (non-test) users requires passing Google's third-party security assessment
  first - see [Google's restricted scope
  requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).
  Until that's done, only manually-added test users can connect their Gmail account.

## Browser worker (Playwright)

`urlExtractor.ts`'s "paste a product URL" path tries a plain `fetch()` first, then falls back to a
separate Playwright rendering service (`/playwright-worker`) for retailers that block or serve an
empty JS-only shell to non-browser requests. That service deploys independently (Railway, Render, or
Fly - not Vercel serverless), because a real Chromium process needs more memory and wall-clock time
than a serverless function budget allows, and most serverless platforms can't run Playwright's
browser binaries at all. See `playwright-worker/README.md` for its API and deployment steps. It's
optional: if `BROWSER_WORKER_URL`/`BROWSER_WORKER_AUTH_TOKEN` are unset, that fallback is simply
skipped and extraction goes straight to "needs manual entry".

## Item search

The "what are you thinking of buying" search box (`desired-items/new`) uses the
[Brave Search API](https://brave.com/search/api/) to find candidate product pages, which are then
run through the same extraction pipeline as the URL-paste path. Brave has no free tier: it's
$5 per 1,000 queries, with $5 of free usage credit per month (roughly 1,000 free queries/month
before charges apply) - confirm current pricing at signup, since this can change. Set
`BRAVE_SEARCH_API_KEY` to enable it; if unset, the search box is disabled and the item-entry flow
falls back to URL paste, screenshot upload, and manual entry.

**Known limitation: search can't reliably find one *specific* SKU for a long-tail or recently
relisted item, even with the correct name.** Confirmed by testing against real, previously-failed
URLs:

- **Retailers recycle numeric product IDs.** A direct Brave search for one Zara product's exact ID
  (`p09598154`) returned ten *different* Zara products under that same number - old listings get
  replaced, and the specific page a URL once pointed to may no longer exist at all. No search
  strategy can find a page that isn't there anymore.
- **Long-tail SKUs are sparsely indexed.** A specific Shein product (by numeric ID) wasn't
  surfaced by Brave under any phrasing tried, including a direct ID search - Shein's catalog is
  enormous, and an individual low-volume listing often isn't well-indexed by general web search.

Because of this, search-sourced candidates are deliberately framed as "closest matches," not exact
finds, and the confirm step always requires the user to verify what was found. Two things exist
specifically to route around this limitation rather than fight it:

- **URL paste never substitutes a search result for the pasted link.** If direct extraction of the
  pasted URL fails, the item's name is guessed from the URL's own slug (marked low-confidence) -
  never replaced by an unrelated search candidate, since the user's pasted link already IS the
  exact item, even when a page can't be scraped.
- **Screenshot upload** is the reliable path for exactly the retailers search handles worst (heavy
  anti-bot blocking on direct fetches) - it's promoted ahead of URL paste on mobile viewports for
  this reason.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
