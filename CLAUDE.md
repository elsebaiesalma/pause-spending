@AGENTS.md

# PAUSE (pause-before-purchase) - project notes for Claude

Next.js 16 + Prisma 7 on Neon Postgres, with Auth.js (Google sign-in) and a Gmail `gmail.readonly` sync. The full parked-item detail lives in `BACKLOG.md`; this file is the summary a new session needs first.

## Resume here

**Done**
- Still want it: the page, outfit suggestions (validated, ids only, description built from names), secondhand links, go-to-store with the once-per-visit prompt, and undecided items on Considering.
- Store-visit columns (`went_to_store_at`, `store_visit_answer`) are applied and recorded on BOTH Neon branches (migration `20260926090000_add_desired_item_store_visit`, checksums match the file). They are in `schema.prisma`, `prisma generate` has run, and `src/lib/stillWantIt/storeVisit.ts` now uses the generated client, every query scoped by `userId`. Database tests cover undecided items (excluded from Kept and from the 60-day sweep, re-asked on the next visit) and cross-tenant access. Commits `44f0b53`, `0877fba`, `5e20fcc`.
- One model constant per feature, each with an env override.
- Feedback pass (2026-10-06, commit `0c2dd82`): global spacing about 28% tighter vertically, body 16px, no text under 12px; one shared header and tab bar in the root layout (`src/components/SiteNav.tsx`) for every signed-in route, with the nav, initials circle and one centered container (`--width-container`) shared by header and pages; new Account page (`/account`, `/settings` redirects to it); Wardrobe seed placeholders, brand stripped from displayed names, add-to-wardrobe in the header with a 15-colour dropdown; landing copy, sourced stats, image slots, and a first-visit Welcome intro on Connect Gmail.
- Wardrobe Rack view (2026-10-13): Grid | Rack toggle, search, rail + shelf line, category divider tabs, hanging vs standing items, sway, drag/arrows/snap, virtualized past 60 items. Logic in `src/lib/wardrobeView.ts`, UI in `src/app/wardrobe/` (`WardrobeBrowser`, `Rack`). Seeded rows now show Unsplash photos (`src/lib/seedWardrobeImages.ts`; existing rows re-pointed with `scripts/pointSeedImagesAtUnsplash.ts`). Not yet checked on a real phone.
- Full suite passing: 85 files, 477 tests. Type check clean. Lint has 3 errors left (see below).

**Waiting on the user**
- Run `prisma/manual/lookbook.sql` on main and test (Lookbook tables, phase 1, 2026-10-13), then confirm. Until then the Lookbook models stay out of `schema.prisma`; phases 2-4 wait on it. Also still pending: `prisma/manual/pause-ended-at.sql`.
- Visual check of the Still want it page and the Considering "Went to the store" section, on desktop and phone. Only DOM measurements of the new layout were taken (2026-10-06); no screenshots have been looked at yet.
- Verify the resale search URL patterns in `src/lib/stillWantIt/resaleSites.json` by hand in a browser. They were written without a live check.
- Create a private GitHub repo. The git repo has no remote, so nothing is pushed.
- Supply the landing images in `public/images/`: `hero`, `pause-screen` (a real screenshot of our Pause screen), `sample-1`, `sample-2`, as .jpg, .jpeg, .png, .webp or .avif. Until a file exists the slot shows a neutral placeholder naming the expected file (`src/components/ImageSlot.tsx`).
- Check the Welcome intro on Connect Gmail in a real browser (first visit only, tap to skip, none with reduced motion), and the phone layout of the new tab bar.

**Lint: 3 errors left, all behavior-changing, so not touched**
- `src/app/connect/gmail/page.tsx:37`: `<a>` to `/api/auth/gmail/start`. `<Link>` can prefetch, and prefetching an OAuth start route is not safe.
- `src/app/dashboard/KeptToggle.tsx:37` and `src/app/desired-items/new/SearchBox.tsx:76`: `react-hooks/set-state-in-effect`. Fixing either changes render timing.

**Design queue (screens to design)**
- Add item
- Receipts review
- Settings: the Account page now has "Coming later" placeholders for Tone and Auto-move timing; the saved-item retention setting would live there
- Item detail
- The pause-ended moment (see "Locked pause state" in Parked items)

**Open decisions (before building)**
- Outfit cache must become durable before deploy. Options: a `DesiredItem` column holding the outfit JSON plus its wardrobe version, or a small table.
- Lower-priced options (section 02) stay hidden until intake stores other-retailer results. Decide what intake stores, and where.
- Email sync must dedupe against a "proceeded" desired item when a matching order arrives. "Yes" creates no `Purchase`, so decide the matching rule (item name, price, date window).
- Model outfit descriptions can refer to the target item even though it is never in the outfit. Decide whether the prompt should forbid that.
- Proceeded items with no list to show them. Decide whether any other proceeded items need a home.
- Parked items are in the "Parked items" section below and in `BACKLOG.md`.

## Environment and branches

- The git repo has one local branch, `master`, and no remote. "Main" and "test" in our notes mean the two **Neon database branches**, not git branches. `DATABASE_URL` is main, `TEST_DATABASE_URL` is test.
- Raw Postgres TCP (5432) is blocked from the sandbox, so `prisma migrate dev` fails with P1001. Read-only SQL over Neon's HTTP adapter works. Migrations that add or change columns are run by the user with `npx prisma migrate deploy` from their own terminal.
- `GMAIL_SYNC_PAUSED=true` is set in `.env` while mock wardrobe data is loaded for UI work. Set it back to `false` after `scripts/deleteSeededMockWardrobe.ts` removes the seeded rows.
- Work is committed on `master` (`a573821` to `13d295a`), not pushed. The working tree is clean.
- Vendored skill packs (`.agents/`, `.claude/skills/`, `skills-lock.json`) are gitignored.

## Wording (2026-10-13)

- "Saved" means money only: the let-go total reads "$540 saved", and Home says "$540 saved by letting 6 things go".
- The old "Saved for later" section is **Undecided**, and the old "Save for later" button is **Decide later**. "Went to the store, undecided" is now **Went to the store**. "Pause for 24 hours", "Pause for 7 days", "Decide later", "Let it go" and "Buy anyway" are identical on every screen.
- Internal names are unchanged on purpose: `saved_for_later`, `savedAt`, `getKeptSummary`, `totalKept`.

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
- **Section 02 (lower-priced options) is hidden until alternatives are stored at intake.** Nothing at intake persists other-retailer results yet. `getStoredRetailerAlternatives()` returns nothing, and no price is ever estimated. Before this section can show anything, intake must store the results, and this function must read them.
- **The outfit cache is in-memory and must be made durable before deploy.** It lives in `globalThis` per process, so each cold start re-calls the model. It is keyed by user, desired item and wardrobe version. Move it to a table or column first.
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
