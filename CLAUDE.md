@AGENTS.md

# PAUSE (pause-before-purchase) - project notes for Claude

Next.js 16 + Prisma 7 on Neon Postgres, with Auth.js (Google sign-in) and a Gmail `gmail.readonly` sync. The full parked-item detail lives in `BACKLOG.md`; this file is the summary a new session needs first.

## Resume here

**Done**
- Still want it: the page, outfit suggestions (validated, ids only, description built from names), a "Build it from your closet" button into the Lookbook board, go-to-store with the once-per-visit prompt, and undecided items on Considering. The lower-priced and secondhand sections (and `resaleSites.json`) were removed 2026-10-13.
- Store-visit columns (`went_to_store_at`, `store_visit_answer`) are applied and recorded on BOTH Neon branches (migration `20260926090000_add_desired_item_store_visit`, checksums match the file). They are in `schema.prisma`, `prisma generate` has run, and `src/lib/stillWantIt/storeVisit.ts` now uses the generated client, every query scoped by `userId`. Database tests cover undecided items (excluded from Kept and from the 60-day sweep, re-asked on the next visit) and cross-tenant access. Commits `44f0b53`, `0877fba`, `5e20fcc`.
- One model constant per feature, each with an env override.
- Feedback pass (2026-10-06, commit `0c2dd82`): global spacing about 28% tighter vertically, body 16px, no text under 12px; one shared header and tab bar in the root layout (`src/components/SiteNav.tsx`) for every signed-in route, with the nav, initials circle and one centered container (`--width-container`) shared by header and pages; new Account page (`/account`, `/settings` redirects to it); Wardrobe seed placeholders, brand stripped from displayed names, add-to-wardrobe in the header with a 15-colour dropdown; landing copy, sourced stats, image slots, and a first-visit Welcome intro on Connect Gmail.
- Wardrobe Rack view (2026-10-13): Grid | Rack toggle, search, rail + shelf line, category divider tabs, hanging vs standing items, sway, drag/arrows/snap, virtualized past 60 items. Logic in `src/lib/wardrobeView.ts`, UI in `src/app/wardrobe/` (`WardrobeBrowser`, `Rack`). Not yet checked on a real phone.
- Full suite passing: 85 files, 477 tests. Type check clean. Lint has 3 errors left (see below).

**Waiting on the user**
- Visual check of the Still want it page and the Considering "Went to the store" section, on desktop and phone. Only DOM measurements of the new layout were taken (2026-10-06); no screenshots have been looked at yet.
- Create a private GitHub repo. The git repo has no remote, so nothing is pushed.
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

## Budget & goals, landing scenes, closet cards (2026-11-03, branch `saving-rewards`, PR #5)

- **Budget & goals** (`/budget`, Settings section of the same name): independent switches for the Monthly plan and the Savings goal. Home asks "What would help most?" (`MoneyChoice`) when neither is set, shows the chosen one, and offers the other as one quiet "Also try" line. `/api/budget` takes `intent=off` and a same-site `returnTo`. The goal sheet is a centred dialog on desktop and a bottom sheet on phones (global `* {margin:0}` breaks native dialog centring, so `.sheet` restores `inset:0; margin:auto`).
- **The `savings_goals` table is hand-applied** (`prisma/manual/savings-goal.sql`, run by the user in Neon on main and test). Until it exists, `isGoalStorageAvailable()` is false and every goal control is hidden; only the plan shows.
- **Landing scenes** (scroll-driven, no React state: a rAF handler edits a CSS variable and a data attribute; default and reduced-motion state is the finished picture): `ReceiptBand` ("It adds up quietly.", sticky stage, `src/lib/landing/receipt.ts` computes the sums) and `UrgeCurve` ("The urge is loud. Then it fades.", `src/lib/landing/urgeCurve.ts`). The receipt is labelled as an example. Sticky needs `overflow-x: clip` on html/body (`hidden` makes body a scroll container and breaks it).
- **Closet:** concentration card is ~640px wide, colour by rank (equal counts share a colour, `tierFor`), top 4 plus "Show all N categories". Cards: brand + date on one line, 2-line name, price bottom-left and colour bottom-right, pinned to the bottom.
- **Pause screen actions:** two pause buttons, "or decide now" divider, Decide later and Let it go as smaller outlined buttons, Buy anyway as a quiet link. Labels unchanged.

## Demo mode (2026-11-02, while Gmail is parked)

- **Google sign-in and Gmail are hidden unless `GMAIL_ENABLED=true`.** The code is untouched; the flag only gates the login button, the landing CTAs, Account's Gmail section and the `/connect/gmail/*` pages (which redirect Home). See `src/lib/demo.ts`.
- **"Try the demo"** (`POST /api/demo`) creates a fresh user per click (`guest-xxxx@demo.pause.test`), seeds the 30-item mock wardrobe with dates shifted so the newest lands this month, sets a $250 plan, and writes an Auth.js database session + the matching cookie (`__Secure-` prefix on https). Demo emails end in `.test`, so the seed scripts never pick one.
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
- The git repo has one local branch, `master`, and no remote. "Main" and "test" in our notes mean the two **Neon database branches**, not git branches. `DATABASE_URL` is main, `TEST_DATABASE_URL` is test.
- Raw Postgres TCP (5432) is blocked from the sandbox, so `prisma migrate dev` fails with P1001. Read-only SQL over Neon's HTTP adapter works. Migrations that add or change columns are run by the user with `npx prisma migrate deploy` from their own terminal.
- `GMAIL_SYNC_PAUSED=true` is set in `.env` while mock wardrobe data is loaded for UI work. Set it back to `false` after `scripts/deleteSeededMockWardrobe.ts` removes the seeded rows.
- Work is committed on `master` (`a573821` to `13d295a`), not pushed. The working tree is clean.
- Vendored skill packs (`.agents/`, `.claude/skills/`, `skills-lock.json`) are gitignored.
- **Run only one dev server at a time.** Two `next dev` processes on different ports share the same `.next` build cache and corrupt it (symptoms: `Internal Server Error`, `TurbopackInternalError: Failed to restore meta`, a missing `.sst` file). Before starting one, check `netstat -ano | grep LISTEN | grep :3000` and reuse the running server; do not delete `.next` while one is running.

## Wording (2026-10-13)

- "Saved" means money only: the let-go total reads "$540 saved", and Home says "$540 saved by letting 6 things go".
- The old "Saved for later" section is **Undecided**, and the old "Save for later" button is **Decide later**. "Went to the store, undecided" is now **Went to the store**. "Pause for 24 hours", "Pause for 7 days", "Decide later", "Let it go" and "Buy anyway" are identical on every screen.
- Internal names are unchanged on purpose: `saved_for_later`, `savedAt`, `getKeptSummary`, `totalKept`.

## Mock wardrobe (reworked and loaded 2026-10-13)

- Data: `data/mock-wardrobe.json` (30 items, CAD, with deliberate near-duplicates and messy cases); images: `public/mock/` (its README lists each filename and a search term). Parsing and row-building: `src/lib/mockWardrobe.ts`; seeding and deleting: `src/lib/mockWardrobeDb.ts`.
- `npx tsx scripts/seedMockWardrobe.ts` is a dry run; `--confirm` writes. Rows are tagged `source = "seed"` with fixed ids per user and item, so re-running updates instead of duplicating. An image is linked only if its file exists in `public/mock/`, so add images and re-run.
- `npx tsx scripts/deleteSeededMockWardrobe.ts` (dry run; `--confirm` deletes) removes only `source = "seed"` rows, refuses if a real wardrobe item was made from a seed purchase, and drops looks left empty.
- Loaded 2026-10-13 on the real account: the 25 older seeds (random ids) and the one look built from them were deleted first, then the 30 items were seeded (so 30 seed + 72 real wardrobe items). No image files are in `public/mock/` yet, so every seed item shows the placeholder until they are added and the seed script is re-run. `.env` has `DEV_WARDROBE_VIEW=seed` and `GMAIL_SYNC_PAUSED=true`; restart `next dev` after changing `.env`.
- Keep `GMAIL_SYNC_PAUSED=true` in `.env` while mock data is loaded.
- **Dev-only view filter:** `DEV_WARDROBE_VIEW=seed|real|all` in `.env` (`src/lib/devWardrobeView.ts`) limits every wardrobe listing (Wardrobe, Home, the board's drawer and suggestions, outfit suggestions, pause-screen matches, confirm-page categories) to seed rows or to real rows, with a "Showing seed items only" banner on every page. It does nothing when `NODE_ENV` is `production`, and `vitest.setup.ts` clears it so tests never depend on it. It is a view only: ownership checks and reads by id ignore it, and a saved look always keeps all of its pieces.

## Brand casing

The product name is always written **PAUSE** in all caps when it is used as a proper noun: logo, nav, headings, body copy, `<title>`, meta descriptions, and emails. "Pause" as an ordinary word, such as "Pause for 24h", "your pause is up" or "the pause", keeps normal casing. Code identifiers such as `PauseScreenPage` are not affected.

## Pages: state at 2026-10-04 (from reading the code, not a visual check)

- **Landing** (`src/app/page.tsx`): rebuilt to the supplied mockup, white base with pink accent. Committed.
- **Sign-in / onboarding** (`src/app/login`, `src/app/connect/gmail/*`): Gmail connect, success, done and delete flows exist. Login has no page-level CSS module.
- **Dashboard** (`src/app/dashboard`): functional, with its own CSS module. Modified and not committed. It still uses the older cream/blush theme.
- **Wardrobe** (`src/app/wardrobe`, `[id]/edit`): functional, with CSS module. Modified and not committed.
- **Pause screen** (`src/app/desired-items/[id]/pause`): functional, with CSS module, loading state and BuyAnywayButton. Modified and not committed. The reflection form (replaces / need score / reasons) saves silently to nothing until the reflection migration lands.
- **Considering tab** (`src/app/considering`, `let-go`): functional, with CSS module. Untracked. The lifecycle timestamps are written by code that relies on the unapplied migration.
- Mockups: `mockups/*.html` (cream/white set) and `mockups/midnight/*.html` (Midnight Editorial, 4 pages). Not wired to the app.

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
- **Pause screen:** "Build this look from your closet" sits in "A moment to think". A saved look for the item counts as a reflection answer for the Buy anyway gate (`hasReflectionAnswer`). The reflection fields are kept in sessionStorage across the trip to the board.
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
| Pause-screen redundancy explanation | `REDUNDANCY_MODEL` | `ANTHROPIC_MODEL_REDUNDANCY` | `claude-opus-5` | `claude-opus-5` |

- The "before" column is read from commit `d3974a1`. All nine call sites used `claude-opus-5`, so no previous model is missing.
- URL and search extraction (`urlExtractor.ts`, `searchProduct.ts`) makes no Claude call, so it has no constant.
- Redundancy was not on the original feature list. It has its own constant so that its model setting is not lost.
- The old Post-wait recommendations page, library and `RECOMMENDATIONS_MODEL` were deleted (2026-10-13): nothing linked to them, and Still want it replaced them.
- `claude-opus-5`, `claude-sonnet-5` and `claude-sonnet-5-5` all returned successful live responses on 2026-10-05. The live structured-output path (`messages.parse` with a zod schema) also returned valid output on `claude-sonnet-5-5`.
- Mocked tests cannot catch a bad model ID. Re-run a real call after changing any model.
- Outfit descriptions are built server-side from the chosen items' names. The model returns item ids only, and any extra prose it adds is ignored.

## Still want it (built 2026-10-05)

- The page is at `src/app/desired-items/[id]/still-want-it`, reached from "Buy anyway". Its state is in two columns, `went_to_store_at` and `store_visit_answer`, read and written through the generated client in `src/lib/stillWantIt/storeVisit.ts`. The hand-run SQL is kept in `prisma/manual/still-want-it-store-visit.sql` for reference.
- **The outfit cache is durable** (table `outfit_suggestions`, applied by hand on main and test 2026-10-14; `src/lib/stillWantIt/outfitCacheStore.ts`). Keyed by user, optional desired item (null for the Lookbook "New look") and wardrobe version; one row per user and item, replaced when the wardrobe changes; an hour of freshness.
- **"Yes" creates no `Purchase` row.** It only sets the desired item to `proceeded` with a price. Email sync must dedupe against that proceeded item, or it will create a second record for the same purchase.
- "Not sure yet" keeps the item `proceeded` with `decision_outcome` `proceeded`, and sets `store_visit_answer` to `not_sure`. Considering lists it under "Went to the store, undecided". The Kept total (dropped only) and the 60-day sweep (saved_for_later only) never touch it. Clicking "Go to" again clears the answer, so the next visit asks again.
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
- Open question: how to pick "closest" when rule-based matches tie. There is no ranking beyond the DB's return order.
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
