@AGENTS.md

# PAUSE (pause-before-purchase) - project notes for Claude

Next.js 16 + Prisma 7 on Neon Postgres, with Auth.js (Google sign-in) and a Gmail `gmail.readonly` sync. The full parked-item detail lives in `BACKLOG.md`; this file is the summary a new session needs first.

## Environment and branches

- The git repo has one local branch, `master`, and no remote. "Main" and "test" in our notes mean the two **Neon database branches**, not git branches. `DATABASE_URL` is main, `TEST_DATABASE_URL` is test.
- Raw Postgres TCP (5432) is blocked from the sandbox, so `prisma migrate dev` fails with P1001. Read-only SQL over Neon's HTTP adapter works. Migrations that add or change columns are run by the user with `npx prisma migrate deploy` from their own terminal.
- `GMAIL_SYNC_PAUSED=true` is set in `.env` while mock wardrobe data is loaded for UI work. Set it back to `false` after `scripts/deleteSeededMockWardrobe.ts` removes the seeded rows.
- Nothing is committed since `9c072f3`. About 180 files are modified or untracked, including all the Pause, Considering and Wardrobe work.

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

## Pending SQL: apply before anything relies on it

Verified on 2026-10-04 with a read-only `information_schema` query against both Neon branches:

1. **`prisma/migrations/20260925090000_add_desired_item_reflection`**: adds 6 reflection columns to `desired_items`. Missing on **both** main and test.
2. **`prisma/migrations/20260925100000_add_desired_item_considering_lifecycle`**: adds `paused_at`, `saved_at`, `let_go_automatically`, `let_go_at`. Missing on **both** main and test. Apply together with item 1.
3. **`prisma/migrations/20260924060000_make_purchase_price_nullable`**: not recorded in `_prisma_migrations` on either branch. The column nullability was not checked. Confirm it before deploying.

Order for the user, on each branch: `npx prisma migrate deploy`. Then, once, `npx prisma generate`. Do not run `prisma generate` until both branches have the desired_items columns, because the generated client would select columns that do not exist yet.

The two new SQL files each say "NOT YET APPLIED" in their headers. Keep that until the user confirms it has run.

## Migration rules

- Destructive or hard-to-reverse migrations (renames, drops, anything with real data behind it) are not applied through `scripts/apply-migration-via-http.mjs`. Hand-write the SQL, show it for review, and let the user run `prisma migrate deploy` themselves.
- A migration that must run only after a verified backfill is kept outside `prisma/migrations/` until the backfill is checked.

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
