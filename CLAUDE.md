@AGENTS.md

# PAUSE (pause-before-purchase)

A pause-before-you-buy app for clothing. Next.js 16, React 19, Prisma 7 on Neon Postgres, Auth.js for sessions, the Anthropic API for tagging and outfit suggestions. Gmail import exists but is parked, so "Try the demo" is the way in. Parked work lives in `BACKLOG.md`.

## Commands

- `npm run dev` starts the app. Run only one dev server at a time: two share the `.next` cache and corrupt it (`Internal Server Error`, `TurbopackInternalError`). Reuse a running one and never delete `.next` under it.
- `npx tsc --noEmit` (run `npx next typegen` first for route types), `npm run lint`, `npx vitest run`. Tests need a database: `TEST_DATABASE_URL` points at a separate Neon branch, and `vitest.setup.ts` refuses to run without it.
- `npm run build` runs `prisma generate && next build`. Node 24.

## Database and migrations

- "Main" and "test" mean the two Neon database branches (`DATABASE_URL`, `TEST_DATABASE_URL`), not git branches.
- Never remove a fallback, add a model to `schema.prisma`, or rely on a new table or column until the user confirms the SQL ran on BOTH Neon branches. Write the code to degrade until then and say what is waiting.
- Hand-run SQL lives in `prisma/manual/`. It is recorded in `_prisma_migrations` with a migration folder whose `migration.sql` checksum matches. Never edit an applied migration file: one changed byte changes the checksum.
- Destructive or hard-to-reverse migrations (renames, drops, anything with real data) are hand-written, shown for review and run by the user with `prisma migrate deploy`. Raw Postgres on port 5432 is blocked in the cloud sandbox, so migrations are run from the user's own terminal.
- Photos (`photos` table), savings goals (`savings_goals`) and the `pause_ended_at` column came from hand-run SQL. Their controls stay hidden until the user confirms the SQL ran (`isPhotoStorageAvailable()`, `isGoalStorageAvailable()`), and `pause_ended_at` stays out of `schema.prisma` until then.
- Use the generated Prisma client everywhere except the two unapplied column groups, which use raw SQL in `src/lib/pauseScreen/reflection.ts` and `src/lib/considering/consideringMeta.ts`.
- Every query is scoped by the session user. Cross-tenant tests cover the store-visit and lookbook code.

## Git

Default branch is `main`. Work goes on a feature branch and is merged by PR (squash). The PR is how a change reaches the live site, so check it is merged before saying it shipped.

## Wording and brand

- The product name is **PAUSE** in all caps when it is a proper noun (logo, nav, headings, body copy, `<title>`, emails). "Pause" as an ordinary word ("Pause for 24 hours", "your pause is up") keeps normal casing. Code identifiers are unaffected.
- "Closet" is the user-facing word. Code keeps `wardrobe` names. "Saved" means money only.
- Buttons read the same everywhere: "Pause for 24 hours", "Pause for 7 days", "Decide later", "Let it go", "Buy anyway". The build-a-look button reads "Style what you already own".
- Internal names stay as they were on purpose: `saved_for_later` (shown as Undecided), `savedAt`, `getKeptSummary`, `totalKept`.

## Design system ("Espresso and Rose")

Tokens and contrast notes are at the top of `src/app/globals.css`. Every component reads colour through the variables, so a palette change is a token change. Check any new text and background pair for WCAG AA before using it.

- White pages. Espresso `#2A1208` for text, buttons and dark bands. Soft rose `#C98A92` is the accent for fills, and text only on espresso. Deep rose `#8E4752` for small accent text on white. Taupe `#6B5A52` for secondary text. Warn `#A12B2B` always comes with an icon.
- Scales are tokens. Headings use `--heading-xl/lg/md/sm`. Text uses `--text-xs/sm/md/lg/xl` on Polaris's 12, 14, 16 steps, with no text under 12px. Two shadows, `--shadow-float` (menus, toasts) and `--shadow-overlay` (dialogs, sheets). Do not add new sizes or shadows.
- Polaris rules apply. One filled primary per screen, one button style in sentence case, badges for status, plain language, an empty state with one action, no percentages for similarity (show which attributes match).
- Buttons are at least 44px tall, 48px for full-width actions. Forms are capped at 26rem by `form { max-width }`, so full-width forms set `max-width: none`.
- Motion explains state. Respect `prefers-reduced-motion`. The rack sway's overshoot is deliberate, and nothing else bounces.

## How the app is organised

- **Nav and pages:** one header and tab bar in the root layout (`src/components/SiteNav.tsx`). Phones get a bottom tab bar (Decisions, PAUSE, Closet) and a hamburger menu. Every page uses `PageHeader`. The initials menu holds Settings (`/account`), Budget and goals (`/budget`) and sign out.
- **Decisions** (`/considering`) has tabs through `?tab=`: On pause, Undecided, Let go, Bought. `itemStatus()` gives each item one status, and every item has a page at `/desired-items/[id]`. A month filter (`?month=`) follows the person's clock through the `pause_tz` cookie.
- **Pause screen:** the wanted item next to its closest owned piece (`rankSimilarItems`), a step-through of questions (`ReflectionSteps`), then the cost against the monthly plan. Pauses end silently into Undecided, and Home never mentions an ended pause, because reminding someone of a paused item undoes the cooling-off.
- **Still want it** (reached from "Buy anyway"): store-visit state, outfit suggestions (the model returns item ids only, and descriptions are built server-side from names). "Yes" creates no `Purchase`, so email sync must dedupe against a proceeded item when it resumes.
- **Closet** has Pieces and Looks tabs. Pieces has Grid and Rack views. `PieceForm` is shared by Add and Edit. The Looks board uses `@use-gesture/react`, saves coordinates as fractions of a 4:5 board, and asks "Leave without saving?" before discarding changes.
- **Demo mode:** Google sign-in and Gmail are hidden unless `GMAIL_ENABLED=true`. "Try the demo" (`POST /api/demo`) creates a fresh guest user, seeds the 43-piece mock closet, a $300 plan and a few past decisions. Demo emails end in `.test`. Anything shown as wanted is never also in the closet. A guided tour (`DemoTour`, steps and placement in `src/lib/demoTour.ts`) starts on a new demo's Home. Each step lights an element marked `data-tour`, progress is saved in the browser under the demo user's id, and "Take the tour" in the initials menu restarts it.
- **Models:** one constant per feature in `src/lib/anthropicModels.ts`, each with an env override. Mocked tests cannot catch a bad model ID, so run a real call after changing one. Model calls on the pause screen are non-fatal.

## Gotchas

- A redirect after a multipart POST must be 303. The default 307 re-sends the body and Next then tries to run it as a Server Action.
- Sticky needs `overflow-x: clip` on html and body. `hidden` makes body a scroll container and breaks it.
- The global `* { margin: 0 }` breaks native `<dialog>` centring, so `.sheet` restores `inset: 0; margin: auto`.
- A history guard on the look board must copy Next's `history.state`, or Next reloads the page.
- Server render is UTC. Times the person reads render in the browser through `LocalTime`.
- Mock images go in `public/mock/` and must also be listed in `data/mock-images.json`, because serverless functions cannot see `public/`.
- `GMAIL_SYNC_PAUSED=true` stays set in `.env` while mock data is loaded. `DEV_WARDROBE_VIEW=seed|real|all` limits wardrobe listings in development only (never in production).
- Seed scripts (`scripts/seedMockWardrobe.ts`, `deleteSeededMockWardrobe.ts`) do a dry run unless given `--confirm`. Ask before running them against the real account.
- The `<a>` to `/api/auth/gmail/start` is a plain anchor on purpose. Prefetching an OAuth start route is not safe.

## Writing conventions

- Comments explain why, and match the density of nearby code.
- README voice is plain and active, with no dashes, colons, semicolons, asterisks, emojis or hashtags.
- Commits and PRs end with the attribution lines the session gives.
