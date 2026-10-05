@AGENTS.md

# PAUSE (pause-before-purchase) - project notes for Claude

Next.js 16 + Prisma 7 on Neon Postgres, with Auth.js (Google sign-in) and a Gmail `gmail.readonly` sync. The full parked-item detail lives in `BACKLOG.md`; this file is the summary a new session needs first.

## Resume here

**Done**
- Still want it: the page, outfit suggestions (validated, ids only, description built from names), secondhand links, go-to-store with the once-per-visit prompt, and undecided items on Considering.
- One model constant per feature, each with an env override. Commits `ffc221c` (one model), `53a5684` (Still want it), `cb9c3d7` (undecided on Considering), `2784230` (notes), `45abe0e` (per-feature models, server-side outfit descriptions), and this notes commit.
- Full suite passing: 81 files, 446 tests. Type check and lint clean.

**Waiting on the user**
- Run `prisma/manual/still-want-it-store-visit.sql` on BOTH Neon branches (main and test), then run its verification query. Both branches must show `went_to_store_at` and `store_visit_answer` present.
- Once confirmed, step 3 of the plan, all in one pass: add the two columns to `schema.prisma`, record a migration with matching checksums on both branches, run `prisma generate`, add the database tests for undecided items (excluded from Kept and from the 60-day sweep, re-asked on the next visit), and run the full suite. Nothing in step 3 has started.

**Design queue (decide before building)**
- Outfit cache must become durable before deploy. Options: a `DesiredItem` column holding the outfit JSON plus its wardrobe version, or a small table. Decide which.
- Lower-priced options (section 02) stay hidden until intake stores other-retailer results. Decide what intake stores, and where.
- Email sync must dedupe against a "proceeded" desired item when a matching order arrives. "Yes" creates no `Purchase`, so decide the matching rule (item name, price, date window) before email sync can create one.
- Model outfit descriptions can refer to the target item even though it is never in the outfit. Decide whether the prompt should forbid that.
- Verify the resale search URL patterns in `src/lib/stillWantIt/resaleSites.json` by hand in a browser. They were written without a live check.
- Visual check of the Still want it page and the Considering "Went to the store" section, on desktop and phone. No browser session has been used yet.
- Proceeded items with no list to show them: "Buy anyway" now lands on Still want it, and undecided ones appear on Considering. Decide whether any other proceeded items need a home.
- The older recommendations page (`src/app/desired-items/[id]/recommendations`) is no longer linked from the resolve route. Decide whether to keep or remove it.
- Parked items are in the "Parked items" section below and in `BACKLOG.md`.

## Environment and branches

- The git repo has one local branch, `master`, and no remote. "Main" and "test" in our notes mean the two **Neon database branches**, not git branches. `DATABASE_URL` is main, `TEST_DATABASE_URL` is test.
- Raw Postgres TCP (5432) is blocked from the sandbox, so `prisma migrate dev` fails with P1001. Read-only SQL over Neon's HTTP adapter works. Migrations that add or change columns are run by the user with `npx prisma migrate deploy` from their own terminal.
- `GMAIL_SYNC_PAUSED=true` is set in `.env` while mock wardrobe data is loaded for UI work. Set it back to `false` after `scripts/deleteSeededMockWardrobe.ts` removes the seeded rows.
- Work is committed on `master` (`a573821` to `13d295a`), not pushed. The working tree is clean.
- Vendored skill packs (`.agents/`, `.claude/skills/`, `skills-lock.json`) are gitignored.

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
| Post-wait recommendations | `RECOMMENDATIONS_MODEL` | `ANTHROPIC_MODEL_RECOMMENDATIONS` | `claude-opus-5` | `claude-opus-5` |

- The "before" column is read from commit `d3974a1`. All nine call sites used `claude-opus-5`, so no previous model is missing.
- URL and search extraction (`urlExtractor.ts`, `searchProduct.ts`) makes no Claude call, so it has no constant.
- Redundancy and recommendations were not on the original feature list. Each has its own constant so that its model setting is not lost.
- `claude-opus-5`, `claude-sonnet-5` and `claude-sonnet-5-5` all returned successful live responses on 2026-10-05. The live structured-output path (`messages.parse` with a zod schema) also returned valid output on `claude-sonnet-5-5`.
- Mocked tests cannot catch a bad model ID. Re-run a real call after changing any model.
- Outfit descriptions are built server-side from the chosen items' names. The model returns item ids only, and any extra prose it adds is ignored.

## Still want it (built 2026-10-05; SQL not yet applied)

- The page is at `src/app/desired-items/[id]/still-want-it`, reached from "Buy anyway". Its state is in two columns, `went_to_store_at` and `store_visit_answer`, described in `prisma/manual/still-want-it-store-visit.sql`. They are read and written with raw SQL until that SQL is confirmed on both branches. After that, move them into `schema.prisma` with a recorded migration and run `prisma generate`.
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
- When the hold ends, send one quiet opt-out notification, or a daily digest. Tone example: "Your pause on [item] is up. Decide whenever you're ready."
- Items not returned to within about 7 days of unlock become a tracked outcome, "faded". Its place in the dashboard is undecided.
- Show the saved reflection answers on the unlock screen. Open question: the app is in-app only, so a digest may need to be an in-app badge.

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
