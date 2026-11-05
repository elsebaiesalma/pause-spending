# Pages — dependency trees

## /dashboard (Dashboard)
Entry: `src/app/dashboard/page.tsx`
Dependencies:
- `src/lib/prisma.ts` (data, not UI)
- `src/lib/waitQueue.ts` (data)
- `src/lib/wardrobe.ts` (data)
- `src/lib/budget.ts` (data)
- No sub-components — the entire page is one file, plain JSX with `.page`, `.page__eyebrow`,
  `.page__lede`, `.btn`/`.btn-primary`/`.btn-danger`/`.btn-quiet`, `.nav-links`, `.stack`, `.row`,
  `.divider` from `globals.css`.

Renders (in order): eyebrow + "Dashboard" h1 → waiting-queue banner (conditional) → primary CTA
("I want to buy something") → a 2x2 inline stat grid (wardrobe count / items dropped + $ saved /
month spend vs budget / still-waiting count) → unconditional nav row (Purchase history / Wardrobe /
Budget / Wishlist) → a Gmail-status block with 4 branches (connected / expired / disconnected / not
connected), each with its own CTA(s).

## /desired-items/new (Item Input)
Entry: `src/app/desired-items/new/page.tsx`
Dependencies: none — single static file, three independent `<form>`s using global `input`/`button`
styles.

Renders: h1 "I want to buy this" → three stacked sections, each its own form:
1. "Paste a product URL" — `<input type="url">` + "Look it up" button → POSTs to `/api/desired-items/from-url`.
2. "Upload a screenshot" — `<input type="file">` + "Identify item" button → POSTs to `/api/desired-items/from-screenshot`.
3. "Or just type it" — `<input>` + "Continue" (`.btn-primary`) → POSTs to `/api/desired-items/from-text`.

All three redirect to `/desired-items/[id]/confirm` on success.

## /desired-items/[id]/confirm (Confirm)
Entry: `src/app/desired-items/[id]/confirm/page.tsx`
Dependencies:
- `src/lib/prisma.ts` (data)

Renders: eyebrow "One more look" → h1 "Confirm this item" → conditional lede (extraction failed vs
succeeded) → item image (if any) → a form with itemName/price/imageUrl/category/primaryColor/
styleTags inputs, all pre-filled from the extraction, `.btn-primary` "Confirm" → "Cancel, start over"
link back to `/desired-items/new`.

## /desired-items/[id]/pause (Pause Decision Screen)
Entry: `src/app/desired-items/[id]/pause/page.tsx`
Dependencies:
- `src/lib/pauseScreen/assemblePauseScreen.ts` — orchestrates: `src/lib/tagging/tagDesiredItem.ts`,
  `src/lib/tagging/similarity.ts` (shortlist query), `src/lib/pauseScreen/redundancyExplanation.ts`
  (LLM call), `src/lib/budget.ts` (spend/remaining).

Renders: eyebrow "Before you buy" → h1 = item name → price (`.item-row__price`, large serif) → item
image (if any) → h2 "What you already own like this" → either an empty-state message OR an
**italic pull-quote** (the redundancy explanation, styled inline with `var(--font-display)`,
font-style italic, a `--color-blush` left border - this is the emotional centerpiece of the page) +
a list of similar wardrobe items (`.item-row` — thumb, name, "owned since" date) → h2 "Budget impact"
→ either 3 stat rows (spent / after-purchase / remaining) or a "set a budget" prompt → h2
"Take a moment" → 4 action buttons in a `.row`: "Wait 24 hours" (`.btn-primary`), "Wait 7 days"
(`.btn-primary`), "I still want this" (plain `.btn`, posts to `/api/desired-items/[id]/resolve`
outcome=proceeded), "Save for later" (plain `.btn`, outcome=saved_for_later).

## /desired-items/[id]/recommendations ("Still Want It")
Entry: `src/app/desired-items/[id]/recommendations/page.tsx`
Dependencies:
- `src/lib/recommendations/assembleRecommendations.ts` — orchestrates
  `src/lib/recommendations/postWaitRecommendations.ts` (two LLM calls: comparables/secondhand,
  outfit ideas grounded in real active wardrobe items).
- Local helper component `AlternativeList` (defined in the same file, not extracted) renders one
  `<h3>` + a list of `<p>` rows (name, ~price, note) for comparables and for secondhand.

Renders: eyebrow "Still deciding" → h1 "Still thinking about {item}?" → h2 "Lower-priced
alternatives" → an italic `.note` disclaimer ("AI best guesses, not verified listings...") →
`AlternativeList` for comparables, then for secondhand (each optional/empty-state aware) → h2
"Outfit ideas from what you already own" → a list of `.item-row`s (wardrobe item thumb + a text
suggestion referencing it) or an empty-state line → a single form: "Save for later instead"
(`.btn-primary`, posts outcome=saved_for_later).

## /wardrobe
Entry: `src/app/wardrobe/page.tsx`
Dependencies: `src/lib/wardrobe.ts` (data).
Renders: h1 "Wardrobe" → "Add an item" form (name/category/color/style tags/use-case tags/owned-since)
→ h2 "Active items (N)" → a list of `.item-row`s, each with an "Edit" link and a "Mark returned" form.

## /purchases
Entry: `src/app/purchases/page.tsx`
Dependencies: `src/lib/prisma.ts` (data).
Renders: h1 "Purchase history" → a list of `.item-row`s; any `status = needs_review` row additionally
shows a `.badge-review` tag, an inline correction form (name/price/category + "Confirm"), and a
"Discard" button.

## /budget
Entry: `src/app/budget/page.tsx`
Dependencies: `src/lib/budget.ts` (data).
Renders: h1 "Budget" → either a "no budget set" prompt with a suggested-figure note + a set-budget
form, or the current budget amount (large serif figure) + spent/remaining rows + an update form.

## /wishlist
Entry: `src/app/wishlist/page.tsx`
Renders: h1 "Wishlist" → a list of `.item-row`s (image, name, price) for every
`pauseStatus = saved_for_later` item, or an empty-state line.

## /waiting
Entry: `src/app/waiting/page.tsx`
Renders: h1 "Waiting on these" → h2 "Ready for a decision" (elapsed items, each with "I still want
this" / "No, drop it" forms) → h2 "Still waiting" (a plain list with each item's `wait_until`).
