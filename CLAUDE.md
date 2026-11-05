@AGENTS.md

# PAUSE (pause-before-purchase) - project notes for Claude

Next.js 16 + Prisma 7 on Neon Postgres, with Auth.js (Google sign-in) and a Gmail `gmail.readonly` sync. The full parked-item detail lives in `BACKLOG.md`; this file is the summary a new session needs first.

## Resume here

**Done**
- Still want it: the page, outfit suggestions (validated, ids only, description built from names), a "Style what you already own" button into the Lookbook board, go-to-store with the once-per-visit prompt, and undecided items on Considering. The lower-priced and secondhand sections (and `resaleSites.json`) were removed 2026-10-13.
- Store-visit columns (`went_to_store_at`, `store_visit_answer`) are applied and recorded on BOTH Neon branches (migration `20260926090000_add_desired_item_store_visit`, checksums match the file). They are in `schema.prisma`, `prisma generate` has run, and `src/lib/stillWantIt/storeVisit.ts` now uses the generated client, every query scoped by `userId`. Database tests cover undecided items (excluded from Kept and from the 60-day sweep, re-asked on the next visit) and cross-tenant access. Commits `44f0b53`, `0877fba`, `5e20fcc`.
- One model constant per feature, each with an env override.
- Feedback pass (2026-10-06, commit `0c2dd82`): global spacing about 28% tighter vertically, body 16px, no text under 12px; one shared header and tab bar in the root layout (`src/components/SiteNav.tsx`) for every signed-in route, with the nav, initials circle and one centered container (`--width-container`) shared by header and pages; new Account page (`/account`, `/settings` redirects to it); Wardrobe seed placeholders, brand stripped from displayed names, add-to-wardrobe in the header with a 15-colour dropdown; landing copy, sourced stats, image slots, and a first-visit Welcome intro on Connect Gmail.
- Wardrobe Rack view (2026-10-13): Grid | Rack toggle, search, rail + shelf line, category divider tabs, hanging vs standing items, sway, drag/arrows/snap, virtualized past 60 items. Logic in `src/lib/wardrobeView.ts`, UI in `src/app/wardrobe/` (`WardrobeBrowser`, `Rack`). Not yet checked on a real phone.
- Full suite passing: 139 files, 859 tests. Type check clean. Lint has 3 errors left (see below).

**Waiting on the user**
- Visual check of the Still want it page and the Considering "Went to the store" section, on desktop and phone. Only DOM measurements of the new layout were taken (2026-10-06); no screenshots have been looked at yet.
- The repo `elsebaiesalma/pause-spending` is being made public. A private archive, `pause-spending-archive`, holds the full history including old branches and the removed `playwright-worker` and `docs/superdesign` folders. Never run `git push --mirror` to it again (it would delete archive-only branches); use `git push --all`.
- Supply the landing images in `public/images/`: `hero`, `pause-screen` (a real screenshot of our Pause screen), `sample-1`, `sample-2`, as .jpg, .jpeg, .png, .webp or .avif. Until a file exists the slot shows a neutral placeholder naming the expected file (`src/components/ImageSlot.tsx`).
- Check the Welcome intro on Connect Gmail in a real browser (first visit only, tap to skip, none with reduced motion), and the phone layout of the new tab bar.

**Lint: 3 errors left, all behavior-changing, so not touched**
- `src/app/connect/gmail/page.tsx:37`: `<a>` to `/api/auth/gmail/start`. `<Link>` can prefetch, and prefetching an OAuth start route is not safe.
- `src/app/dashboard/KeptToggle.tsx:37` and `src/app/desired-items/new/SearchBox.tsx:76`: `react-hooks/set-state-in-effect`. Fixing either changes render timing.

**Design queue (screens to design)**
- Receipts review
- Item detail
- No separate pause-ended screen: pauses now end silently into Undecided.

**Open decisions (before building)**
- Email sync must dedupe against a "proceeded" desired item when a matching order arrives (for when email parsing resumes). "Yes" creates no `Purchase`, so decide the matching rule (item name, price, date window).
- Parked items are in the "Parked items" section below and in `BACKLOG.md`.

## Mobile pass (2026-11-05, branch `mobile-pass`)

- **Phone nav:** the tab bar is Decisions, PAUSE (centre, pause icon), Closet. Home is the logo and a hamburger beside it (`MobileMenu` in `SiteNav.tsx`) listing Home, Decisions, Closet. Landing header shows only "Try the demo".
- **Receipt hero:** the Resume button uses an SVG triangle. The "▶" character became a colour emoji on iPhone.
- **Urge chart:** below 700px the rotated axis title becomes a caption above the chart (High and Low stay on the axis).
- **Recap card:** the button sits beside the title, a horizontal line separates the top and bottom metric pairs on phones, and the tip reaches toward the card edges.
- **Closet:** phones show All plus the first category and a "•••" pill for the rest. The rack sway never worked because `.track` redeclared `--sway`; it is now set on the scroller only. Rack hint reads "Swipe to scroll through your closet" on touch.
- **Look board:** Back (swipe or button) with unsaved changes opens the same "Leave without saving?" dialog, via a guard history entry that copies Next's `history.state`.
- **Owned since:** Clear sits under the wheel and the gap above it is gone.

## Mobile pass 2 (2026-11-05, branch `mobile-pass-2`)

- **One "Undecided" colour:** `deciding` and `undecided` share the rose `badge` in `STATUS_BADGE` (one was neutral grey, so the same word showed two colours).
- **Owned since wheel:** 3 rows tall, months loop (December above January; three copies re-centred in `Wheel`), Clear (quiet, left) and Done (outlined, right) on one row under it, in `PieceForm`.
- **Landing, phones:** below 700px the urge graph is replaced by `UrgeTexts` (four texts to yourself, loud to quiet, same `URGE_MARKS` words).
- **Recap card:** "See decisions" (short label on phones) sits beside "Your month"; the tip's lightbulb is vertically centred.

## Mobile pass 3 (2026-11-05, branch `mobile-pass-3`)

- The recap card has no "See decisions" button any more (phones and laptop). The month filter and `?tab=let-go&month=` links still work.
- **Owned since picker:** Set (outlined) with Cancel (restores the date from when it opened) and Clear below it. Form buttons ("Add to closet" and Cancel) stack on phones with more space between, and sit side by side with a wider gap from 700px.
- Vercel: `ssoProtection` is `all_except_custom_domains`, so every `.vercel.app` URL asks visitors for a Vercel login until protection is changed or a custom domain is added.

## Mobile pass 4 (2026-11-05, branch `mobile-pass-4`)

- **Owned since picker:** full-width Set (outlined) and Cancel (plain, restores the date from when it opened) stacked under the wheel, no Clear. Laptop and phone alike.
- **Landing, phones:** `UrgeTexts` is titled "Sound familiar?" and plays once when scrolled into view (typing dots, then each bubble, one by one; static with reduced motion or no script). Laptop keeps the graph.
- **Vercel:** deployment protection changed 2026-11-05 from `all_except_custom_domains` to `preview`, so production `.vercel.app` URLs are public and previews still need a Vercel login.

## Mobile pass 5 (2026-11-05, branch `mobile-pass-5`)

- **Tab bar colour:** all three tabs use the dark ink (inactive was grey, which read as a different shade next to Closet). The current tab is bold with a rose underline.
- **Owned since:** Cancel removes the chosen date (it no longer restores the earlier one), on phone and laptop.

## Mobile pass 6 (2026-11-05, branch `mobile-pass-6`)

- **Goal and budget sheets:** Cancel comes first in the source. On phones the column is reversed so Save goal / Save plan sits on top with Cancel below, full width. From 600px the pair is right-aligned and adjacent, Cancel on the left and Save on the right. Button sizes did not change. Shared `.sheetActions` in `GoalCard.module.css`.

## Mobile pass 7 (2026-11-05, branch `mobile-pass-7`)

- **Goal and budget sheets:** `.sheetForm` sets `max-width: none`, so the form fills the dialog instead of stopping at the global 26rem cap. Inputs and the Cancel / Save pair now end at the dialog's right padding.

## Pause screen, last question (2026-11-05, branch `pause-last-step`)

- The build-a-look button reads **"Style what you already own"** (it was "Build this look from your closet"), so it is clear the outfit is made from pieces the person owns, not the item they are considering. The "Or picture it with what you own" line above it is gone.
- The last question has no Skip: its fields are optional, so "See the cost" is already the skip. Questions 1 and 2 keep Back, Skip and Next.

## Cleanup pass (2026-11-05, branch `cleanup-pass`)

- **Let go page** "You already have" uses the pause screen's ranking (`getClosestOwned` passes `itemName`), so the Everlane tee shows the COS tee.
- **Cost bar** (`ImpactRows`): spent and this item share one `.impactFill` layer that wipes in once (clip-path, 900ms); the plan marker is drawn from the first frame, with a "Your plan" key when over.
- **Recap month:** demo accounts see the CURRENT month all month; real accounts still get last month during the first 7 days. `loadMonthlyRecap` takes `timeZone`; Home reads it from the `pause_tz` cookie (`src/lib/timezone.ts`, set by `TimezoneCookie`), and `localDate` shifts "now" so the month keys, still UTC, follow the person's clock. `data/demo-decisions.json` now has six decisions this month and one last month.
- Recap card text is slightly larger (not the tip), and the tip icon is a lit bulb with rays.
- **Decisions:** the status pill sits beside the item name on every tab (`DecisionRow`). A month dropdown (`MonthFilter`, `src/lib/considering/monthFilter.ts`) filters Undecided, Let go and Bought by when the item was added; no `month` param means the current month on the person's clock (`pause_tz` cookie), `month=all` means all time. On pause is never filtered. The recap button links to `?tab=let-go&month=<key>`.
- **Recap card:** button beside the title, tip at the bottom, metrics on a subgrid so labels, figures and notes line up; eyebrow, tip and button are 16px.
- **Recently added** shows the four newest hanging pieces: satin cami, linen shirt, tie-front blouse, denim shorts (dates in `data/mock-wardrobe.json`; the coat moved to September). This month's demo spend is $280 of $300, so the sample loafers still go over plan.
- README: logo from `docs/brand/` (Clash Display Bold as SVG paths, light and dark), why framed around impulse, regret and returns (NRF 2025 figure), plus a product decision on friction. `docs/README.md` lists what changed after the original plan.
- Planning docs moved into `docs/`; stray `vercel` and `vercell` files removed; photos are from Pexels (`public/mock/README.md`). CI: `.github/workflows/ci.yml` runs `prisma generate` and a type check (tests need a database, so they stay local).

## Feedback pass (2026-11-04 evening, branch `polaris-pass`)

- **Edit dialogs are Home-only.** Settings (`/budget`, now titled "Budget & Goals") edits inline: `PlanValue` and the new `GoalEdit` open their fields under the row with Save and Cancel. `BudgetSheet` and `GoalSheet` are used on Home only.
- **Landing:** no "Example" badge; the hero card is the sample closet's grey pinstripe coat vs grey wool coat (`HeroPreview`, photos from `public/mock/`); "Three simple steps"; the privacy FAQ became "Can I use my real orders to build my closet?" (coming soon, demo for now); `DemoBanner` returns null on `/`; the landing header always shows "Try the demo" (plus "Open app" when signed in) while Gmail is off.
- **Sample item** (`SAMPLE_ITEM` in `src/lib/demo.ts`) is the Zara brown loafers with their photo; that piece is not in the mock closet (43 pieces, all with photos). Photoless mock items were removed.
- **Pause screen:** two columns from 900px (comparison pinned left, questions + cost + decision stacked right); on phones a sticky strip with both thumbnails sits at the top of "A moment to think". Other matches are folded under "Also in your closet (N)".
- **Concentration bars** are shaded deep rose to light rose (`.tinted` in `ProgressBar.module.css`), no longer brown. `MonthYearWheel` no longer prints "Not set".
- **Add item** only takes typed text. Link and screenshot entry were removed from the UI because they are not read reliably; the API routes remain.
- **Demo history:** `createDemoSession` seeds `DEMO_DECISIONS` (`src/lib/demo.ts`, data in `data/demo-decisions.json`): six decisions this month (one Undecided, four Let go, one Bought) and one last month, so Decisions isn't empty and the current-month recap has numbers (see Cleanup pass). They use `sourceType = "demo_history"` (`DEMO_HISTORY_SOURCE`), which Home's setup guide ignores.
- **Monthly recap** is espresso with white text and soft-rose accents, with notes under Let go and Saved. Demo accounts see it all month (`loadMonthlyRecap(..., { allMonth })`); real accounts keep the first-7-days window.
- **Demo decisions are real closet photos** (`data/demo-decisions.json`, read by `DEMO_DECISIONS`): Everlane tee (Undecided; the COS tee stays in the closet), Gap black tee (Let go), last month's heels, striped crochet top, navy tank (let go) and poncho (bought), and the month before's ruched green shirt. Each is removed from `data/mock-wardrobe.json` (now 43 pieces; the red Roots sweatshirt was also removed 2026-11-05). `waitDays` seeds `paused_at`/`wait_until` so the recap's tip (`recapTip`) can compare 7-day and 24-hour waits. Rule: anything shown as wanted is never also in the closet.
- **Times on the server were UTC** ("unlocks tomorrow, 4:35am" at 11:35 pm Toronto). Unlock times and paused dates now render in the browser through `LocalTime` (`src/components/LocalTime.tsx`).
- Home order: greeting, Get to know PAUSE, monthly recap (with a lightbulb tip), add box. "Add a piece" opens right under Closet's tabs. Reason fields have examples ("e.g. I'd wear it every week"). The date wheel shows only Clear above it.
- Concentration bars: `RANK_SHADES` in `ClosetConcentration.tsx` (espresso, plum, deep rose, rose, pink, light pink), one per distinct count, on a paler track.
- **Closest match is ranked** (2026-11-05): `rankSimilarItems` in `src/lib/tagging/similarity.ts` orders the shortlist (same colour family, then shared tags, then the garment word at the end of the name), so the pause screen's "You own" piece is the best match, not the database's first row. The "What works for you" Home card (`PatternCard`, `pausePattern.ts`) was removed; the recap tip carries that message.
- **Pause compare (2026-11-05):** both sides show a brand line (owned brand from the purchase merchant, else `brand`), a brand-stripped name in the same display style (`.compareTitle`), and a colour dot meta row; "Also in your closet" cards do the same. The cost bar animates (spent fills, then this item grows; off with reduced motion). The closet badge "Well stocked" marks the fullest category (ties share it, at least 3 active pieces), so it lands on Tops in the demo; near-duplicate clusters only drive the "4 similar blue bottoms" sentence. The "not decided" badge now reads "Undecided" like its tab, and Let go rows put the pill beside the name. Greeting says evening until 5am.
- Decided against hover sub-menus in the nav (no hover on phones; Closet already has Pieces | Looks tabs).

## Polaris pass 3 (2026-11-04, branch `polaris-pass`)

- **Receipt hero:** fixed 8-line window (`WINDOW_LINES`, `lineAt`, `tabTotals` in `src/lib/landing/receipt.ts`); new items join at the bottom and the track slides up one line per tick; the paper never changes size. Pause button sits centred on the paper, half see-through; no PAUSED stamp, no visible "example" caption (kept in the screen-reader caption). Hero copy: "Want it now? Want it tomorrow?".
- **Colour:** no colour names are written any more (`prisma/manual/clear-wardrobe-color-names.sql` clears old ones; user runs it on both Neon branches). `ColorPicker` shows the closet's 3 most common families, "Show more", and "Other" (typed word, resolved to a family by `resolveColor`: lookup, then model, then null; the word still shows on cards). "Espresso" wording is "brown". Concentration bars are shaded by count (`tintsByCount`: darkest for the fullest category, equal counts share a shade, each lower count lighter). Blush token is `#edd9d0`.
- **Owned since:** a field showing "March 2026" (or "Select month and year") that opens `MonthYearWheel` (Month + Year scroll wheels, no day) with Done; the hidden `ownedSince` input lives in `PieceForm`.
- **Pause screen:** "A moment to think" is a step-through (`ReflectionSteps`: Back, Skip, Next; all inputs stay mounted), ending on `ImpactRows` (Spent so far, This item, If you buy it, bar, over-plan warning). Buy anyway is a plain button, no answer needed (`BuyAnywayButton` and its gate removed). Divider reads "Or skip the wait".
- **Edit budget** opens `BudgetSheet` (same dialog as Edit goal) on Home and Budget & goals.
- **Get to know PAUSE** has a Minimize / Expand button (`CollapsibleGuide`, remembered in this browser via `src/lib/dashboard/guideVisibility.ts`); minimized it keeps the title and progress bar. Account-level memory is parked.
- **Nav order** is Home · Decisions · Closet (tab bar: Home · Decisions · (+) · Closet). Home's "saved / on pause / pieces" is a three-figure card (`.glance`). Bought rows have "Mark as returned" (posts `outcome=dropped` to the resolve route, so the item moves to Let go).
- **Redirects after a multipart POST must be 303.** The default 307 re-sends the body to the target page, and Next then tries to run it as a Server Action ("Failed to find Server Action"). `from-screenshot` was returning 307, which is why a screenshot upload showed "This page couldn't load".
- **Add box:** the text box stays; the screenshot drop zone is now a small "Add a screenshot" button beside Continue (its file input uses the `form` attribute).

## Photo storage (2026-11-04, branch `polaris-pass`)

- Photos live in a `photos` table (bytea, shrunk JPEG, per user), served by `GET /api/photos/[id]` (owner only, immutable cache). The URL is stored in the existing `image_url` columns. Hand-run SQL: `prisma/manual/photos.sql`; it is **not** in `schema.prisma` and every photo control stays hidden (`isPhotoStorageAvailable()`) until the user confirms it ran on BOTH Neon branches.
- Code: `src/lib/photos/photoStore.ts`, `src/components/PhotoField.tsx` (shrinks in the browser to 1000x1250 first, because Vercel caps request bodies near 4.5MB; server cap 4MB). Used on the desired-item confirm page and Closet Add/Edit piece. The three routes use `photoChangeFromForm` and redirect 303.
- Photos are stored only; nothing reads them. Colour and category are not filled from a photo (that would be a separate vision call).

## Polaris pass (2026-11-04, branch `polaris-pass`)

- **Landing:** the receipt is the hero (`src/app/ReceiptHero.tsx`), at the top: copy and "Try the demo" left, a receipt right that **keeps printing by itself** (a new item about every 1.1 s from the fixed cycle in `src/lib/landing/receipt.ts`: `feedLine`, `runningTotals`), so the tab only grows; past 14 lines the oldest scroll off under a fade and are counted ("+ N earlier items"). A faint Pause button shows on the paper (full strength on hover or focus); clicking the paper does the same. Paused = PAUSED stamp, repeats struck through, TOTAL drops, "KEPT IN YOUR PLAN" shows; the button becomes Resume. The resting state is the finished stamped example ($292 to $223, $69 kept): reduced motion, no script and the server render never print. It only prints while on screen and while the tab is visible. The old hero follows as "What PAUSE does". The "Checkout is built to be fast" stats band now sits just above the FAQ. FAQ heading is "Frequently asked questions". The landing header is sticky and solid white, and its "Try the demo" posts to `/api/demo`. The urge section has no caption or caveat line; its paragraph is full width, the chart has a y-axis, and the line does not start drawing until the whole chart (axis and hour labels) is on screen.
- **Money cards:** Home's plan and goal share `MoneyCard` (`src/app/dashboard/MoneyCard.tsx`): label + title and an outlined edit button ("Edit budget" / "Edit goal"), one bar, one figures row, one note, so rows line up. Budget & goals' plan card is built like the goal's (`PlanValue.tsx`: line and bar left, "Edit budget" right opening the amount form); both buttons share a min width so the bars end together. The page lede is one sentence ("PAUSE only counts money you choose not to spend. It never moves any.").
- **Pause screen (Polaris pass 2):** two questions are visible (what it replaces, how much you need it); reasons for/against and "Build this look" are folded under "More ways to think it through" (still in the form when closed; open if a look or reasons exist). The right column is one stack, sticky on desktop: the cost as a labelled progress bar (warn tone only when over the plan) with one line of text, then one primary (Pause for 24 hours) beside Pause for 7 days, then Decide later, Let it go and Buy anyway as plain text buttons in one row. Labels are unchanged.
- **Closet concentration card:** full width, rows in two columns from 900px (no "Show all"), one-column with "Show all N categories" on phones. Each row is a `ProgressBar` whose max is the real total of pieces ("5 of 30 pieces"), neutral tone, rose only for a category with near-duplicates (`toneFor`). No rank colours any more.
- **Account menu:** Budget & goals is indented under Settings (it is reached from Settings).
- **Toggles:** `SlidingToggle` (`src/components/SlidingToggle.tsx`) is the pill whose dark highlight slides between options; Closet uses it for Grid | Rack and Sort.
- **Home order:** greeting, setup guide (until done), add box, plan + goal cards side by side (or `MoneyChoice` when neither), one quiet line (saved · on pause · pieces), pattern, Recently added. The dark stats band is gone.
- **Add item:** one shared `AddItem` (`src/components/AddItem.tsx`) on Home and `/desired-items/new`: one box for a link or a name, a screenshot drop zone, Continue never disabled (explains when empty). Confirm page: photo left, Name / Brand / Price ($ prefix) / Category / Colour, rest under "More details". Both pages use `.page--narrow`.
- **Settings and Budget & goals** use the annotated layout (title left, card right). Settings cards show an On/Off badge with "Turn on" / "Turn off" buttons, not switches. Goal confirmations are toasts (`ActionToast` reads `?goal=saved|removed`); goal errors stay inline. A new goal can include this month's let-go money (`countFrom=month` starts it on the 1st). "Start over with a fresh closet" sits below a divider and confirms in a dialog (`StartOverButton`).
- **Nav:** no tab is highlighted on `/desired-items/new` or an item's confirm, pause or still-want-it page (`isActive` in `SiteNav.tsx`).
- **Closet:** photo-less items show the garment drawing in their colour (dresses, scarves, belts, sunglasses added). Filter chips wrap. Rack tags have fixed rows, so prices line up. Warn text carries `WarnIcon`.
- **Piece form:** one shared `PieceForm` (`src/components/PieceForm.tsx`, rules in `src/lib/pieceForm.ts`) for Closet's "Add a piece" and the edit page. Every field has a visible label; Name and Owned since are checked on blur with the message under the field; Category is a select of the closet's own categories; Colour is a pill/swatch radio group; Colour name and Owned since sit under "More details". Tags are editable chips: once a name is entered (add mode) `/api/wardrobe/suggest-tags` asks `TAGGING_MODEL` for category, colour and tags (name and category only, no image, nothing stored; a failure answers `suggestion: null` and the form says so). Suggestions only fill what the person left empty; "Suggest tags (again)" overrides. Tags post as comma-joined hidden inputs, so the add and update routes are unchanged, and a piece saved with no tags is still auto-tagged on save. Brand and Price (a `$` money field, checked on blur) sit under "More details" and are stored in `wardrobe_items.brand` / `price` (migration `20261104170000_add_wardrobe_item_brand_price`, applied by the user on both Neon branches 2026-11-04; do not edit the file). A piece made from an order shows its purchase's merchant and price instead, takes precedence in `toWardrobeEntry`, and its edit form hides the two fields (the update route leaves them alone when the form sends neither). Photos: see "Photo storage" below. `createManualWardrobeItem` now keeps the saved piece when tagging fails instead of returning a 500.
- **Global:** forms are capped at 26rem by `form {max-width}`; full-width forms set `max-width: none`. `.money-field` is the $-prefix input. A React key warning on `/wardrobe` predates this pass and is still open.

## Budget & goals, landing scenes, closet cards (2026-11-03, branch `saving-rewards`, PR #5)

- **Budget & goals** (`/budget`, Settings section of the same name): independent switches for the Monthly plan and the Savings goal. Home asks "What would help most?" (`MoneyChoice`) when neither is set, shows the chosen one, and offers the other as one quiet "Also try" line. `/api/budget` takes `intent=off` and a same-site `returnTo`. The goal sheet is a centred dialog on desktop and a bottom sheet on phones (global `* {margin:0}` breaks native dialog centring, so `.sheet` restores `inset:0; margin:auto`).
- **The `savings_goals` table is hand-applied** (`prisma/manual/savings-goal.sql`, run by the user in Neon on main and test). Until it exists, `isGoalStorageAvailable()` is false and every goal control is hidden; only the plan shows.
- **Landing scenes** (superseded for the receipt by the Polaris pass above): `UrgeCurve` ("The urge is loud. Then it fades.", `src/lib/landing/urgeCurve.ts`). The receipt is labelled as an example. Sticky needs `overflow-x: clip` on html/body (`hidden` makes body a scroll container and breaks it).
- **Closet:** concentration card is ~640px wide, colour by rank (equal counts share a colour, `tierFor`), top 4 plus "Show all N categories". Cards: brand + date on one line, 2-line name, price bottom-left and colour bottom-right, pinned to the bottom.
- **Pause screen actions:** two pause buttons, "or decide now" divider, Decide later and Let it go as smaller outlined buttons, Buy anyway as a quiet link. Labels unchanged.

## Demo mode (2026-11-02, while Gmail is parked)

- **Google sign-in and Gmail are hidden unless `GMAIL_ENABLED=true`.** The code is untouched; the flag only gates the login button, the landing CTAs, Account's Gmail section and the `/connect/gmail/*` pages (which redirect Home). See `src/lib/demo.ts`.
- **"Try the demo"** (`POST /api/demo`) creates a fresh user per click (`guest-xxxx@demo.pause.test`), seeds the 43-piece mock wardrobe with dates shifted so the newest lands this month, sets a $300 plan (`DEMO_MONTHLY_BUDGET`), and writes an Auth.js database session + the matching cookie (`__Secure-` prefix on https). Demo emails end in `.test`, so the seed scripts never pick one.
- Mock images go in `public/mock/` and must also be listed in `data/mock-images.json` (serverless functions can't see `public/`).
- The pause screen's two model calls (tagging, redundancy explanation) are non-fatal: a failed call logs and the screen renders without it. The redundancy explanation is generated but not shown anywhere yet; decide whether to show it or drop the call.

## Design system (2026-11-02, "Espresso and Rose")

- White pages; espresso `#2A1208` for text, buttons and dark bands; soft rose `#C98A92` as the one accent (fills, and text only on espresso); deep rose `#8E4752` for small accent text on white; blush `#F6EAE3` tints; taupe `#6B5A52` secondary text; warn `#A12B2B` always with an icon. Tokens and contrast notes are at the top of `src/app/globals.css`.
- Polaris rules followed: one button style in sentence case (primary, secondary, quiet link), one primary per section, badges for status, plain-language copy, empty states with one action. Small caps only for eyebrows above titles.
- Shared pieces: `EmptyState`, `ActionToast` (`?done=let-go|undecided` from the resolve route), `DemoBanner` (demo accounts), Home's `SetupGuide` (progress from real data, `src/lib/dashboard/setupGuide.ts`), and the pause screen's attribute grid (`src/lib/pauseScreen/attributeMatch.ts`, a band, never a percentage).

## Information architecture (2026-11-02)

- Nav: Home · Closet · (+) Pause · Decisions. URLs are unchanged (`/wardrobe`, `/lookbook`, `/considering`); only labels moved. "Closet" is the user-facing word everywhere; code keeps `wardrobe` names.
- Closet has two tabs, Pieces (`/wardrobe`) and Looks (`/lookbook`) (`ClosetTabs`). Decisions has four tabs via `?tab=`: On pause, Undecided (includes "Not sure yet" store visits and items left on the pause screen without a choice), Let go, Bought (`listBoughtItems`). `/considering/let-go` redirects to the Let go tab.
- One status per item: `itemStatus()` in `src/lib/considering/itemStatus.ts`. Every item has a page at `/desired-items/[id]` with actions for its status; a paused item shows only name, brand and unlock time.
- Every page uses `PageHeader` (title, optional back link, one primary action). The header's "Pause a purchase" is outlined and hidden on Home, so each screen has one filled primary. The initials circle opens a menu: Settings (`/account`), Monthly plan (`/budget`), Start over (demo), Sign out.

## Pre-deploy checklist

- Fix the 3 lint errors listed under "Resume here".
- **Set the host to Node 24.** `package.json` has `engines.node` of `24.x`, but `engines` is advisory unless the host enforces it, so choose the Node version in the host's settings.
- **Run `prisma generate` as part of the build, not through install scripts.** The `build` script is just `next build`, so nothing in the build generates the client; leaving it to an install script is fragile, because npm 11 reports several install scripts as not yet allowed (next item). Make the host's build command `prisma generate && next build` (or put it in the `build` script), and confirm a clean `npm ci` followed by the build works from a fresh checkout.
- **Review the npm 11 `allowScripts` warning.** `npm install` lists four packages whose install scripts are not yet covered by an `allowScripts` setting: `@prisma/engines` (postinstall), `prisma` (preinstall), `esbuild` (postinstall) and `unrs-resolver` (postinstall). Run `npm install-scripts ls` and decide per package whether to approve it (`npm install-scripts approve <pkg>`). Do not approve one just to silence the message: check what each script does and what breaks without it (the Prisma engines and esbuild binary are the likely ones that matter; `unrs-resolver` is a lint resolver).
- Apply the pending manual SQL if not yet run (`prisma/manual/pause-ended-at.sql`, `prisma/manual/outfit-suggestions.sql`). The user runs manual SQL in Neon's SQL editor on main and the test branch, not from a terminal.

## Environment and branches

- **Never remove a fallback, add a model to `schema.prisma`, or rely on a new table or column until the user has confirmed the SQL ran on BOTH Neon branches (main and test).** Write the code to degrade until then, and say what is waiting on that confirmation.
- Hand-run SQL is recorded in `_prisma_migrations` with a migration folder whose `migration.sql` checksum matches (see `20261014120000_add_outfit_suggestions`). `prisma/manual/pause-ended-at.sql` has been applied (column exists on both branches) but has no migration record.
- The git remote is `elsebaiesalma/pause-spending`; the default branch is `main` and work goes on a feature branch, merged by PR (squash). "Main" and "test" in our notes about data mean the two **Neon database branches**, not git branches. Vercel previews use a separate Neon preview branch that lacks the newer columns, so the demo fails there; production is fine. `DATABASE_URL` is main, `TEST_DATABASE_URL` is test.
- Raw Postgres TCP (5432) is blocked from the sandbox, so `prisma migrate dev` fails with P1001. Read-only SQL over Neon's HTTP adapter works. Migrations that add or change columns are run by the user with `npx prisma migrate deploy` from their own terminal.
- `GMAIL_SYNC_PAUSED=true` is set in `.env` while mock wardrobe data is loaded for UI work. Set it back to `false` after `scripts/deleteSeededMockWardrobe.ts` removes the seeded rows.
- Vendored skill packs (`.agents/`, `.claude/skills/`, `skills-lock.json`) are gitignored.
- **Run only one dev server at a time.** Two `next dev` processes on different ports share the same `.next` build cache and corrupt it (symptoms: `Internal Server Error`, `TurbopackInternalError: Failed to restore meta`, a missing `.sst` file). Before starting one, check `netstat -ano | grep LISTEN | grep :3000` and reuse the running server; do not delete `.next` while one is running.

## Wording (2026-10-13)

- "Saved" means money only: the let-go total reads "$540 saved", and Home says "$540 saved by letting 6 things go".
- The old "Saved for later" section is **Undecided**, and the old "Save for later" button is **Decide later**. "Went to the store, undecided" is now **Went to the store**. "Pause for 24 hours", "Pause for 7 days", "Decide later", "Let it go" and "Buy anyway" are identical on every screen.
- Internal names are unchanged on purpose: `saved_for_later`, `savedAt`, `getKeptSummary`, `totalKept`.

## Mock wardrobe (stock photos added 2026-11-04)

- Data: `data/mock-wardrobe.json` (43 items, CAD, with deliberate near-duplicates and messy cases: 3 white tops, a 4-piece blue bottoms cluster, 2 brown loafers, 2 grey coats; every piece has a photo; the Zara loafers are the demo sample item, not a closet piece); images: 52 cropped 800x1000 stock photos in `public/mock/`, each also listed in `data/mock-images.json` (its README lists each filename and brand; photos are from Pexels). Demo accounts get all of it automatically. Parsing and row-building: `src/lib/mockWardrobe.ts`; seeding and deleting: `src/lib/mockWardrobeDb.ts`.
- `npx tsx scripts/seedMockWardrobe.ts` is a dry run; `--confirm` writes. Rows are tagged `source = "seed"` with fixed ids per user and item, so re-running updates instead of duplicating. An image is linked only if its file exists in `public/mock/`, so add images and re-run.
- `npx tsx scripts/deleteSeededMockWardrobe.ts` (dry run; `--confirm` deletes) removes only `source = "seed"` rows, refuses if a real wardrobe item was made from a seed purchase, and drops looks left empty.
- The real account was last seeded 2026-10-13 with the older 30-item set (no images). It has NOT been re-seeded with the current photo set; ask first, run the dry run, and use `deleteSeededMockWardrobe.ts` for items whose keys were removed. `.env` has `DEV_WARDROBE_VIEW=seed` and `GMAIL_SYNC_PAUSED=true`; restart `next dev` after changing `.env`.
- Keep `GMAIL_SYNC_PAUSED=true` in `.env` while mock data is loaded.
- **Dev-only view filter:** `DEV_WARDROBE_VIEW=seed|real|all` in `.env` (`src/lib/devWardrobeView.ts`) limits every wardrobe listing (Wardrobe, Home, the board's drawer and suggestions, outfit suggestions, pause-screen matches, confirm-page categories) to seed rows or to real rows, with a "Showing seed items only" banner on every page. It does nothing when `NODE_ENV` is `production`, and `vitest.setup.ts` clears it so tests never depend on it. It is a view only: ownership checks and reads by id ignore it, and a saved look always keeps all of its pieces.

## Brand casing

The product name is always written **PAUSE** in all caps when it is used as a proper noun: logo, nav, headings, body copy, `<title>`, meta descriptions, and emails. "Pause" as an ordinary word, such as "Pause for 24h", "your pause is up" or "the pause", keeps normal casing. Code identifiers such as `PauseScreenPage` are not affected.

## Docs and mockups

- `docs/` holds the original thinking: rough idea, requirements Q&A, research, design, implementation plan, the PDD process file, early mockups (`docs/mockups/`). These are history; the shipped app has moved on. Page-by-page state lives in the sections above, not in a stale list.

## Schema state: applied on both branches (as of 2026-10-05)

The user ran `prisma/manual/pending-desired-items.sql` in Neon's SQL editor on main and test, and all 10 columns verified present. The three migrations are recorded in `_prisma_migrations` on both branches, with checksums computed from the files on disk. `prisma generate` has run. The full suite passes (75 files, 404 tests).

- `20260925090000_add_desired_item_reflection`: applied on both.
- `20260925100000_add_desired_item_considering_lifecycle`: applied on both.
- `20260924060000_make_purchase_price_nullable`: already nullable on both branches, so it was only recorded.

The migration files' header comments still say "NOT YET APPLIED". Those headers are stale, but do not edit the `.sql` files: a change to any byte changes its checksum, and Prisma would then flag the recorded migration as modified.

Future schema changes still go through `npx prisma migrate deploy`, run by the user from a terminal with port access. Use the same by-hand SQL pattern if the HTTP route is needed.

## Lookbook schema (applied on both branches, 2026-10-13)

- `looks` and `look_items` (migration `20261013120000_add_lookbook`, recorded in `_prisma_migrations` on main and test with the file checksum). In `schema.prisma`, generated. Do not edit the migration file.
- Same-user integrity is in the database: `look_items` carries `user_id`, with composite foreign keys to `looks(id, user_id)` and `wardrobe_items(id, user_id)` (so `wardrobe_items` has a unique `(id, user_id)`). The wanted-item link (`inspired_by_desired_item_id`) is checked in the app. Pieces are written with `createMany`, never a nested create (two composite keys share `user_id`).
- All reads and writes go through `src/lib/looks/looks.ts`, scoped by the session user. A look with no pieces is deleted on the next list; the Gmail permanent delete also removes looks left empty; deleting a user cascades.
- Coordinates are fractions of a portrait 4:5 board: x, y = top-left corner, scale = width as a fraction of board width, zOrder high draws on top.

## Lookbook (built 2026-10-13)

- **Board** (`src/app/lookbook/board`, full screen): opens pre-filled with a suggested outfit (`getBoardSuggestion` in `src/lib/stillWantIt/outfits.ts`, ids validated, laid out by `src/lib/looks/arrange.ts`), or blank (`?blank=1`, or the Start blank button). `?look=` edits a saved look, `?for=<desiredItemId>` builds one for a wanted item (and opens that item's existing look if it has one), `?returnTo=` is where Close and Save go (same-site paths only, `safeReturnPath`). Drag, pinch and the corner handle use `@use-gesture/react`; every action is also a button and a key. Pieces render in a stable DOM order (z-index stacks), because re-ordering nodes mid-drag drops the pointer.
- **Opening is instant.** The suggestion is a promise (`buildSuggestion` in `page.tsx`, 6 s timeout, `src/lib/looks/suggestion.ts`) read by `SuggestionSlot` in the board. While it is pending the board says "Styling a suggestion…" and Start blank stays enabled. If it arrives before anything has been touched it is placed; if the person has already changed anything (a piece, Start blank, the name) it is dropped (`receiveSuggestion`). A placed suggestion becomes the "saved" baseline, so leaving after it is not unsaved work.
- **Unsaved changes.** `hasUnsavedChanges` (`src/lib/looks/dirty.ts`) compares the name and every piece's id, place, size and stacking. Close asks "Leave without saving?" (Save, Leave, Keep editing) in a native `<dialog>` when there is unsaved work, and a `beforeunload` warning covers closing the tab.
- **Lookbook tab** (`/lookbook`): count, New look, thumbnails (`LookThumb`), rename and delete. "Built instead of [item]" is text only.
- **Pause screen:** "Style what you already own" (the build-a-look button) sits in "A moment to think". A saved look for the item counts as a reflection answer for the Buy anyway gate (`hasReflectionAnswer`). The reflection fields are kept in sessionStorage across the trip to the board.
- API: `/api/looks` (POST) and `/api/looks/[id]` (PUT, PATCH rename, DELETE), all scoped by the session user.
- Dependencies install with a plain `npm install` or `npm ci` (no `--legacy-peer-deps`): `@types/node` is `^22` to satisfy vitest 5's peer range, and `engines.node` is `24.x`.

## Migration rules

- Destructive or hard-to-reverse migrations (renames, drops, anything with real data behind it) are not applied through `scripts/apply-migration-via-http.mjs`. Hand-write the SQL, show it for review, and let the user run `prisma migrate deploy` themselves.
- A migration that must run only after a verified backfill is kept outside `prisma/migrations/` until the backfill is checked.

## Model IDs (one constant per feature, in `src/lib/anthropicModels.ts`)

Each feature has its own constant and environment override. Defaults:

| Feature | Constant | Env override | Model before 2026-10-05 | Model now |
| --- | --- | --- | --- | --- |
| Still want it outfits | `OUTFIT_MODEL` | `ANTHROPIC_MODEL_OUTFITS` | (new feature, none) | `claude-sonnet-5-5` |
| Wardrobe tagging, colour family | `TAGGING_MODEL` | `ANTHROPIC_MODEL_TAGGING` | `claude-opus-5` | `claude-opus-5` |
| Receipt pipeline (email classification and extraction) | `RECEIPT_EXTRACTION_MODEL` | `ANTHROPIC_MODEL_RECEIPT_EXTRACTION` | `claude-opus-5` | `claude-opus-5` |
| Screenshot reading | `SCREENSHOT_MODEL` | `ANTHROPIC_MODEL_SCREENSHOT` | `claude-opus-5` | `claude-opus-5` |
| Product link reading (page-text fallback) | `URL_EXTRACTION_MODEL` | `ANTHROPIC_MODEL_URL_EXTRACTION` | (new feature, none) | `claude-sonnet-5-5` |
| Pause-screen redundancy explanation | `REDUNDANCY_MODEL` | `ANTHROPIC_MODEL_REDUNDANCY` | `claude-opus-5` | `claude-opus-5` |

- The "before" column is read from commit `d3974a1`. All nine call sites used `claude-opus-5`, so no previous model is missing.
- URL extraction (`src/lib/itemExtraction/`) reads a link in layers: Shopify's `/products/<handle>.js` feed, then the page's JSON-LD / Open Graph / title (fetched with a desktop-browser user agent), then the browser-worker, then a Claude reading of the page text (`pageTextExtractor.ts`, `URL_EXTRACTION_MODEL`) only when the price is missing or the name is just the page title. Everything Claude fills is "low" confidence. `extractFromUrl(url, { aiFallback: false })` skips the model call; `searchProduct.ts` uses it so a search never triggers several calls. Search extraction itself still makes no Claude call. Verified against saved fixtures only, not live stores.
- Redundancy was not on the original feature list. It has its own constant so that its model setting is not lost.
- The old Post-wait recommendations page, library and `RECOMMENDATIONS_MODEL` were deleted (2026-10-13): nothing linked to them, and Still want it replaced them.
- `claude-opus-5`, `claude-sonnet-5` and `claude-sonnet-5-5` all returned successful live responses on 2026-10-05. The live structured-output path (`messages.parse` with a zod schema) also returned valid output on `claude-sonnet-5-5`.
- Mocked tests cannot catch a bad model ID. Re-run a real call after changing any model.
- Outfit descriptions are built server-side from the chosen items' names. The model returns item ids only, and any extra prose it adds is ignored.

## Still want it (built 2026-10-05)

- The page is at `src/app/desired-items/[id]/still-want-it`, reached from "Buy anyway". Its state is in two columns, `went_to_store_at` and `store_visit_answer`, read and written through the generated client in `src/lib/stillWantIt/storeVisit.ts`. The hand-run SQL is kept in `prisma/manual/still-want-it-store-visit.sql` for reference.
- **The outfit cache is durable** (table `outfit_suggestions`, applied by hand on main and test 2026-10-14; `src/lib/stillWantIt/outfitCacheStore.ts`). Keyed by user, optional desired item (null for the Lookbook "New look") and wardrobe version; one row per user and item, replaced when the wardrobe changes; an hour of freshness.
- **"Yes" creates no `Purchase` row.** It only sets the desired item to `proceeded` with a price. Email sync must dedupe against that proceeded item, or it will create a second record for the same purchase.
- "Not sure yet" keeps the item `proceeded` with `decision_outcome` `proceeded`, and sets `store_visit_answer` to `not_sure`. Decisions lists it under "Went to the store" (Undecided tab). The Kept total (dropped only) and the 60-day sweep (saved_for_later only) never touch it. Clicking "Go to" again clears the answer, so the next visit asks again.
- Pausing again from this page clears a stale `proceeded` outcome (`/wait` sets `decision_outcome` to null).
- The retailer link is a GET route that records the visit and redirects. It is the only write that happens on GET.

## Parked items (not yet scoped; do not build without an explicit go-ahead)

**Email parsing (open)**
- Tighten the confirmations-only filter. Only `order_confirmation` emails should create a `Purchase`. Shipped and delivered emails can look similar for some retailers. See `src/lib/emailExtraction/extractReceipt.ts`.
- Decide how to handle bilingual subjects and bodies: pick one language, keep both, or flag for review.
- Choose a fallback for `itemName` when extraction cannot isolate one. Using the email subject verbatim is the candidate, not yet validated.
- Improve price and image extraction hit rate. These are the most failure-prone parts.
- Reprocessing old purchases is proposed but was deliberately not run. Existing purchases must stay as they are until this is scoped.

**Locked pause state**
- While an item is paused, show only name, brand and "unlocks [date]". Hide the image and product details. No countdown.
- Pauses end silently. There is no unlock notice, notification or digest, and Home never mentions an ended pause: reminding someone of a paused item undoes the cooling-off. When the wait passes, the item quietly moves to Undecided (internally `saved_for_later`), its 60-day clock starts at that moment, and Considering shows "Pause ended Oct 14" with the saved reflection answers still attached. Built 2026-10-13 in `sweepEndedPauses` (`src/lib/considering/consideringMeta.ts`), which runs on Home and Considering loads. The "Pause ended" wording needs `prisma/manual/pause-ended-at.sql` (not applied; keep `pause_ended_at` out of `schema.prisma` until it is).
- Show the saved reflection answers on the unlock screen.

**Pause screen layout**
- Put the wanted item and its single closest owned match side by side ("YOU WANT" / "YOU OWN"). Other matches go below as smaller cards.
- Closest is decided by `rankSimilarItems` (`src/lib/tagging/similarity.ts`). The Let go page uses the same probe, so both screens agree.
- Leave space for the attribute-match row below.

**Similarity display on the pause screen**
- Do not show a percentage. Show which attributes match per owned item, as a grid, optionally summarized as a band ("Very similar" / "Somewhat similar"). Matching is rule-based, so a decimal score would overstate certainty.

**Wardrobe "concentration" view**
- One row per category, sorted by concentration. Each row has a specific sentence, for example "You own 4 similar dark coats & leather jackets", a bar scaled to the largest category, and a count label.
- Restyle to this app's type system, Clash Display / Space Mono / Inter. Do not use the inspiration's serif headline.
- No percentages, no "saturation", no "vulnerability" wording. No wear or cost-per-wear claims, because there is no wear data. No browser-extension framing.
- Possible later option: default to a 7-day wait in well-stocked categories. Opt-in only.

**Saved-item retention**
- Wishlist items (`pauseStatus = "saved_for_later"`) move to Let go after a set period. Options: 30, 60 (default) or 90 days.
- Current state: `SAVED_RETENTION_DAYS = 60` is hard-coded in `src/lib/considering/consideringMeta.ts`. The user-facing setting is not built, and there is no Settings page yet.
- Open: store the setting on `User`. Run the sweep from the existing cron route. Confirm whether `savedAt` or `createdAt` anchors the clock.

## Writing conventions

- Keep comments in the existing style: explain *why*, match the density of nearby code.
- Use `prisma`'s generated client for everything except the two unapplied column groups, which use raw SQL in `src/lib/pauseScreen/reflection.ts` and `src/lib/considering/consideringMeta.ts`. Keep it that way until the migrations are confirmed on both branches.
