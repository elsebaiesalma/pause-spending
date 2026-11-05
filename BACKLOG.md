# Backlog

Parked ideas, not yet scoped for implementation. Nothing here should be built until it's explicitly
picked up and spec'd out.

## Email parsing: open items (parked)

Logged 2026-09-25. Parking email parsing work here mid-investigation - nothing below has been
applied. No reprocess dry run was run, and no existing purchase data was touched or deleted; all
current purchases are exactly as they were. Pick up exactly here:

- **Confirmations-only filter.** Only an `order_confirmation`-typed email should ever create a
  `Purchase` row (see the comment in `src/lib/emailExtraction/extractReceipt.ts`) - the open item is
  making sure that filter is actually tight enough in practice, since shipped/delivered emails can
  look confirmation-like for some retailers.
- **Bilingual handling.** Emails (and the item names extracted from them) that mix two languages in
  one subject/body need a defined handling strategy - not yet decided whether extraction should
  pick one language, keep both, or flag for review.
- **Subject-as-item-name fallback.** What `itemName` should fall back to when the LLM extraction
  can't confidently isolate an item name from the email body - using the email subject line
  verbatim is the candidate approach, not yet implemented or validated against real inbox data.
- **Price and image extraction.** Both are the most failure-prone parts of extraction today (per
  `Purchase.price`'s null-means-needs_review convention and `Purchase.imageUrl`'s optionality) -
  open item is improving hit rate, not just accepting the current miss rate.
- **Reprocess of old data.** A dry run for reprocessing previously-synced/extracted purchases
  (e.g. once the above are improved) was proposed but deliberately NOT run and NOT applied - existing
  purchases must stay exactly as they are until this is explicitly picked back up and scoped.

## Locked pause state (replaces reminder-only design)

Logged 2026-09-24. Not built yet - revisit when explicitly picked up.

**Problem with the current design:** during a 24h/7d wait, the pause screen and waiting queue still
show the item's image and full product details, which keeps re-feeding the visual desire the pause
is meant to interrupt.

**Future spec:**

- While an item is paused, show only the item name, brand, and "unlocks [date/time]" - hide the
  image and other product details for the duration of the hold.
- No countdown timer. A countdown frames the unlock as a prize and builds anticipation, which is
  the opposite of the goal.
- When the hold ends, send exactly one quiet, opt-out notification (or bundle multiple elapsed
  items into a daily digest) - no urgency or celebratory framing. Example tone: "Your pause on
  [item] is up. Decide whenever you're ready."
- If the user doesn't return within ~7 days of unlock, auto-mark the item's status as **faded**
  (let go without an active decision). This becomes a tracked outcome alongside
  purchased/released - not just an implementation detail.
- This **extends** the existing wait/reminder job (`src/lib/waitQueue.ts`, the waiting-queue page),
  it doesn't replace it - the elapsed-item notification stays; the locking/visibility behavior and
  the "faded" outcome are the new pieces.

**Open questions for when this is spec'd out:** how "faded" surfaces in the dashboard/stats
alongside purchased/dropped; what "notification" means given the app is currently in-app-only, no
email/push (see `docs/design/detailed-design.md`'s stated constraint) - a daily digest may need to be an
in-app badge, not an actual push notification, unless that constraint is being revisited too.

**Added 2026-09-25:** the pause screen (`src/app/desired-items/[id]/pause/page.tsx`) now collects
reflection answers - what the item would replace, a 1-7 need score, one reason for/against (see
`src/lib/pauseScreen/reflection.ts`) - at the moment the user pauses, lets go, or buys anyway. When
this locked-pause state is built, show those saved answers back to the user on the unlock screen
("You said this would replace X, and rated your need a 4/7 - still feeling that way?") rather than
only the bare item name/brand/unlock time. This makes the reflection genuinely useful later instead
of a one-way form.

## Pending schema migration: pause-screen reflection answers

Logged 2026-09-25. `prisma/migrations/20260925090000_add_desired_item_reflection/migration.sql` adds
6 columns to `desired_items` (proposed, reviewed, deliberately NOT applied by Claude - see that
file's header for the exact commands to run). Apply it to **both** the main and test Neon branches,
then run `npx prisma generate` once. Until then, `src/lib/pauseScreen/reflection.ts` saves/reads
these via raw SQL specifically so nothing else breaks while it's pending - reflection answers just
silently don't persist yet (logged server-side, never a crash). This is done once both branches
have the columns and `prisma generate` has run against the updated schema.

## Similarity heatmap on the pause screen (parked)

Logged 2026-09-25. Not built. Show how similar the wanted item is to things already owned - a
visual indicator on the pause screen, beyond the current plain-text match reason
(`src/lib/pauseScreen/matchReason.ts`, e.g. "same color · same category").

**Design note for when this is picked up:** avoid a precise percentage ("87% similar") unless the
matching logic can genuinely justify that precision - today's matching is rule-based (category,
colorFamily, keywords, price band), so a decimal-precise score would imply more certainty than
exists. Preferred direction: show WHICH attributes match per owned item (color ✓ category ✓ style ✓
use case ✗) as a small attribute grid, optionally summarized as a band ("Very similar" / "Somewhat
similar") rather than a number.

## Pause screen layout: wanted item paired with its closest match (parked)

Logged 2026-09-25. Not built - a restructuring of the current "01 / Already in your wardrobe"
section (`src/app/desired-items/[id]/pause/page.tsx`), parked rather than applied now.

**Future spec:**

- At the top of the pause screen, show the wanted item side by side with its single closest owned
  match - two equal 4:5 images, labeled "YOU WANT" / "YOU OWN", each with name, price, and purchase
  date under it.
- Any remaining similar items follow below as smaller cards, introduced by a count line (e.g. "2
  more similar pieces") rather than repeating the full paired treatment for every match.
- No matches: the wanted item goes full width instead of pairing with anything, with "Nothing like
  this in your wardrobe." underneath (unchanged from today's empty-state copy).
- Desktop: wanted item on the left, the wardrobe match column on the right.
- Leave visible space between the wanted/owned pair for a future attribute-match row - a separate
  parked feature (see "Similarity heatmap on the pause screen" above) - so that can slot in later
  without another layout pass.

**Open question for when this is picked up:** how "closest match" is chosen when several similar
items tie on the current rule-based matching (category/colorFamily/style overlap) - today's
`similarItems` list has no ranking beyond the DB's own return order, so picking a single "closest"
one needs an actual ranking rule first.

## Wardrobe "concentration" view (parked)

Logged 2026-09-25. Not built - a new view showing where the user's closet is most stocked,
inspired by a category-heatmap design the user shared. Kept and changed pieces below are relative
to that inspiration, not to anything in this codebase today.

**Keep from the inspiration:**

- One row per category, sorted by how concentrated it is.
- A concrete, specific sentence per row, e.g. "You own 4 similar dark coats & leather jackets" -
  computed from the existing similarity matching (clusters of near-duplicates within a category,
  the same rule-based category/colorFamily/style overlap `src/lib/tagging/similarity.ts` already
  uses elsewhere). This is the most valuable part of the idea.
- A horizontal bar per row, and a small tag on the most concentrated category.

**Change from the inspiration:**

- Restyle entirely to this app's own system (Clash Display / Space Mono / Inter, light theme,
  hairline borders) - the inspiration's serif headline is not this app's type system.
- No "Saturation: 94%" or any other percentage - there's no defined metric behind one. Bars show
  item count relative to the user's single largest category, with the actual count as the row's
  label ("8 owned"), never implying more precision than the underlying count-based data has.
- Non-judgmental wording throughout: a title like "Where your closet is concentrated", a tag like
  "Well stocked" - never "Vulnerability heatmap", "Over-saturated", or similar framing.
- Never claims wear frequency, cost-per-wear, or an "optimal rotation" - the app has no wear data
  at all, and must not imply it does.
- Never describes browser interception, hover triggers, or automatic rules tied to a browser
  extension - that's a v2 idea and does not exist in this app.

**Possible future extension (a separate decision, not part of this spec):** default a paused item
to a 7-day wait instead of 24 hours when it falls in a category the concentration view flags as
already well-stocked - opt-in only, never a default behavior change without the user turning it on.

## Configurable saved-item retention (parked)

Logged 2026-09-25. Not built. A Settings page doesn't exist in the app yet - this would be its
first use.

**Future spec:**

- A user-facing setting for how long a wishlist item (`DesiredItem.pauseStatus = "saved_for_later"`,
  shown on `src/app/wishlist/page.tsx`) sits before quietly moving to Let go
  (`decisionOutcome = "dropped"`, the same outcome the pause screen's "Let it go" button already
  sets - see `src/app/api/desired-items/[id]/resolve/route.ts`).
- Three options: 30, 60 (default), or 90 days.
- The move is quiet - no special notification framing implied beyond whatever the app's existing
  outcome-recording already does; this is an expiry default, not a reminder feature.

**Open items for when this is picked up:** where the chosen duration is stored (a new column on
`User`, most likely, since it's a per-account preference, not per-item); what "quietly moving"
means mechanically - a scheduled sweep job is the natural fit, most likely alongside the existing
scheduled sync job (`src/app/api/cron/sync/route.ts`) rather than a second standalone cron target;
and whether the retention clock starts at `DesiredItem.createdAt` or at whenever the item was
actually saved to the wishlist (today those are the same moment, but that's worth confirming stays
true before relying on `createdAt`).
