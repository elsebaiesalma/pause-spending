# Routes

Next.js App Router, file-based. No router config file to read — the tree below IS the routing.

| Path | File | Notes |
|---|---|---|
| `/` | `src/app/page.tsx` | **Landing page** (marketing/intro). Own design system (`page.module.css`, System B). Not wired to real data - static. |
| `/dashboard` | `src/app/dashboard/page.tsx` | Real account home: Gmail status, sync/disconnect/delete, live stats (wardrobe count, items dropped, month spend, waiting count), nav to the pages below. System A. |
| `/wardrobe` | `src/app/wardrobe/page.tsx` | List + add-item form. Real data. |
| `/wardrobe/[id]/edit` | `src/app/wardrobe/[id]/edit/page.tsx` | Edit one wardrobe item. |
| `/purchases` | `src/app/purchases/page.tsx` | Purchase history list, incl. inline "needs review" confirm/discard forms. |
| `/budget` | `src/app/budget/page.tsx` | Set/update monthly budget; shows spend/remaining. |
| `/wishlist` | `src/app/wishlist/page.tsx` | Items with `pauseStatus = saved_for_later`. |
| `/waiting` | `src/app/waiting/page.tsx` | Wait/reminder queue: "ready for a decision" vs "still waiting". |
| `/desired-items/new` | `src/app/desired-items/new/page.tsx` | **Item Input**: paste URL / upload screenshot / type text - three separate forms. |
| `/desired-items/[id]/confirm` | `src/app/desired-items/[id]/confirm/page.tsx` | Confirm/correct extracted item (name, price, image, category, color, style tags) before proceeding. |
| `/desired-items/[id]/pause` | `src/app/desired-items/[id]/pause/page.tsx` | **Pause Decision Screen**: similar owned items + redundancy explanation, budget impact, wait/proceed/save actions. |
| `/desired-items/[id]/recommendations` | `src/app/desired-items/[id]/recommendations/page.tsx` | **"Still Want It"**: comparables, secondhand, outfit ideas, save-for-later. |
| `/connect/gmail` | `src/app/connect/gmail/page.tsx` | OAuth consent screen before redirecting to Google. |
| `/connect/gmail/success` | `src/app/connect/gmail/success/page.tsx` | Post-connect confirmation. |
| `/connect/gmail/delete` | `src/app/connect/gmail/delete/page.tsx` | Permanent-delete confirmation (danger action). |

API routes (`src/app/api/**/route.ts`) are not pages and have no UI - not relevant to design work.

## Key pages for this design pass

The four "Step 3" targets the user asked for **already exist and render** in this codebase - this is
an **SOP: EXISTING UI** target (reproduce-first), not a from-scratch new page:

- "Dashboard" → `/dashboard`
- "Item Input" → `/desired-items/new`
- "Pause Decision Screen" → `/desired-items/[id]/pause`
- "Still Want It" → `/desired-items/[id]/recommendations`

See `pages.md` for each one's dependency tree.
