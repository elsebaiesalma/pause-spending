# Pause Before Purchase — Implementation Plan

Converts the detailed design (`../design/detailed-design.md`) into a sequence of
test-driven, incrementally demoable steps. Each step builds on every previous
step and ends fully wired in — nothing is left orphaned or unintegrated.

## Checklist

- [x] Step 1: Project scaffold and health check
- [x] Step 2: Database choice + data schema (users, email_connections, purchases, wardrobe_items, desired_items, budgets)
- [x] Step 3: Gmail OAuth connect flow with encrypted token storage (Outlook deferred as a quick follow-on)
- [x] Step 4: Disconnect and permanent-delete privacy controls
- [x] Step 5: Email backfill fetch + rule-based classification pre-filter
- [ ] Step 6: LLM classification fallback for ambiguous emails
- [ ] Step 7: Receipt extraction into purchases
- [ ] Step 8: Wardrobe seeding and Wardrobe Service CRUD
- [ ] Step 9: Scheduled periodic sync + manual "sync now"
- [ ] Step 10: Budget Service (manual budget, AI-suggested starting figure, spend tracking)
- [ ] Step 11: Structured tag extraction and similarity shortlist matching
- [ ] Step 12: Item Extraction Service (URL / screenshot / typed input, with confirmation)
- [ ] Step 13: Redundancy explanation + Pause Decision Screen (core end-to-end demo)
- [ ] Step 14: Wait/Reminder Queue (24h/7d in-app waiting)
- [ ] Step 15: Post-Wait Recommendations (comparables, secondhand, outfit ideas, wishlist)
- [ ] Step 16: Failure-mode hardening across all flows

---

### Step 1: Project scaffold and health check

**Objective:** Stand up the Next.js app with nothing else attached yet — no database, no external accounts — so there's a real, runnable app to build into.

**Implementation guidance:** Initialize the Next.js project (TypeScript) and add a single `/api/health` route that returns a static `{status: "ok"}` response. No database or ORM decision is made here — that's deferred to Step 2, when there's an actual schema to persist.

**Tests:** A test that hits `/api/health` and asserts a 200 response with the expected body.

**Integration with previous work:** N/A — this is the foundation.

**Demo:** Run the app locally, hit `/api/health` in a browser or `curl`, see the JSON response confirming the app runs.

---

### Step 2: Database choice + data schema (users, email_connections, purchases, wardrobe_items, desired_items, budgets)

**Objective:** Decide the database and ORM/migration tool now that there's an actual schema to persist, then create the full data schema from the design's Data Models section, with `user_id` on every table from the start.

**Implementation guidance:** Pick and wire up a database (e.g. SQLite locally for now, or a managed Postgres if preferred — either works for this step; the design's Postgres-specific features, `jsonb` token storage and `pg_cron`, aren't exercised until Steps 3 and 9) and an ORM/migration tool (e.g. Prisma or Drizzle), then write migrations for all six tables exactly as specified in the design (field names/types, `status`/`pause_status` enums as text with app-level validation, `email_connections.encrypted_token` as a JSON/`jsonb` field). Seed a single row in `users` for the app's one current user — every other table's rows reference that `user_id`. Update `/api/health` to also confirm a successful DB round-trip.

**Tests:** Migration tests that run the full migration set against a clean test database and assert every table/column exists with the expected type; a basic CRUD test per table (insert a row, read it back, including the `users` FK constraint rejecting an invalid `user_id`); an updated health-check test asserting it now reports failure (not a crash) if the DB connection is broken.

**Integration with previous work:** Extends the app from Step 1 with real persistence for the first time.

**Demo:** Run the migration against a fresh database, then run a small script that inserts one row into each table (linked to the seeded user) and prints them back — proves the schema is real and usable, not just a mermaid diagram.

---

### Step 3: Gmail/Outlook OAuth connect flow with encrypted token storage

**Objective:** Let the user connect a Gmail or Outlook account, with explicit consent, and store the resulting OAuth token encrypted at the application level (on top of provider disk encryption).

**Implementation guidance:** Implement the OAuth authorization-code flow for both providers (Google OAuth in testing mode per the design's accepted limitation; Microsoft identity platform for Outlook), a consent-confirmation UI step that states plainly what is read and what is never done, and the AES-256-GCM envelope-encryption routine (via an app-level KMS key) used before writing tokens into `email_connections.encrypted_token`.

**Tests:** An integration test (mocked OAuth provider) verifying a completed connect flow results in an `email_connections` row whose stored token is ciphertext, never plaintext, in the database; a test that decrypting it with the correct key recovers the original token; a test that the consent step is shown before any token exchange happens.

**Integration with previous work:** Writes into the `email_connections` table from Step 2.

**Demo:** Click "Connect Gmail" (or Outlook) in the UI, complete the provider's consent screen, and see the app show "Connected" — with the stored token confirmed encrypted via a quick database inspection.

---

### Step 4: Disconnect and permanent-delete privacy controls

**Objective:** Give the user the two distinct, explicit privacy controls the design requires: "disconnect" (stop syncing, keep already-parsed data) and "permanently delete" (revoke access and purge everything derived from that connection).

**Implementation guidance:** Implement disconnect as a token-revocation call plus `email_connections.status = 'disconnected'` (sync skips disconnected connections; existing `purchases`/`wardrobe_items` rows are untouched). Implement permanent delete as revocation plus a cascading delete of every row (`purchases`, `wardrobe_items`, `email_connections` itself) tied to that connection's `user_id`/`source_email_connection_id`.

**Tests:** Integration tests asserting: disconnect stops future sync attempts (verified in Step 5+ once sync exists — stub it here) while leaving existing rows intact (row counts unchanged); permanent delete actually removes rows (asserted by row-count-before-vs-after, not just a success response) and calls the provider's token-revocation endpoint.

**Integration with previous work:** Operates on the `email_connections` row created in Step 3, plus (from this point forward) any `purchases`/`wardrobe_items` rows that later steps create against it.

**Demo:** With a connected account, click "Disconnect" and confirm parsed data (if any exists yet) remains; reconnect, then click "Permanently delete my data" and confirm the connection and all its derived rows are gone from the database.

---

### Step 5: Email backfill fetch + rule-based classification pre-filter

**Objective:** Pull the last 6 months of email from a connected account and run the rule-based sender-domain/keyword pre-filter to decide, for the confident cases, whether each email is an in-scope (clothing/shoes/accessories) order confirmation — without yet extracting purchase details.

**Implementation guidance:** Implement the Gmail API (`historyId`-based) and Microsoft Graph (delta query) fetch paths for a 6-month backfill window, and the rule-based classifier (known fashion-retailer sender domains and subject-line keyword list) that confidently labels the common case as in-scope, out-of-scope, or "ambiguous — needs LLM" (handled in Step 6). Persist a lightweight in-memory or temp-table result set for now; full persistence into `purchases` comes in Step 7.

**Tests:** Fixture-based tests using a set of real-shaped (synthetic/anonymized) sample order-confirmation emails covering major retailer HTML patterns, plus clearly out-of-scope emails (electronics, grocery, subscriptions) — asserting the pre-filter correctly includes/excludes each without invoking any LLM call, and correctly flags the deliberately ambiguous fixtures as "needs LLM" rather than guessing.

**Integration with previous work:** Reads the decrypted token from the `email_connections` row (Step 3); respects `status = 'disconnected'` from Step 4 by skipping those connections.

**Demo:** Trigger a backfill run against a connected test account (or fixture-fed mock API) and print a report: N emails fetched, X confidently in-scope, Y confidently out-of-scope, Z flagged ambiguous.

---

### Step 6: LLM classification fallback for ambiguous emails

**Objective:** Resolve the "ambiguous" emails from Step 5 using an LLM classification pass on subject/sender/snippet, per the hybrid approach the user explicitly required over pure-LLM classification.

**Implementation guidance:** Add the LLM call (forced JSON-schema output: `in_scope: boolean, confidence: enum`) invoked only for emails the rule-based filter couldn't confidently decide. Emails where even the LLM reports low confidence are marked for the manual review queue (used starting in Step 7) rather than force-classified.

**Tests:** Using the ambiguous fixtures from Step 5 (e.g. a department store selling both clothing and home goods), assert the LLM path is invoked only for those, returns a classification, and that a deliberately low-confidence fixture is routed to "needs review" rather than being auto-decided either way.

**Integration with previous work:** Extends the Step 5 pipeline directly — every email now ends in one of: confidently in-scope, confidently out-of-scope, or needs-review, with no email left unclassified.

**Demo:** Re-run the Step 5 backfill demo against a mixed fixture set including ambiguous emails; the report now shows zero "unresolved" emails — every one is in-scope, out-of-scope, or needs-review.

---

### Step 7: Receipt extraction into purchases

**Objective:** For every email classified in-scope (Step 5/6), extract merchant, order date, item name, price, category, and product image/link, and persist the result as a `purchases` row; low-confidence extractions go into a review queue instead of being silently discarded.

**Implementation guidance:** Implement the LLM structured-extraction pass (forced JSON schema) over cleaned email HTML for merchant/date/item/price/category; pull the product image directly from `<img>` tags in the email body per the design (no vision call needed for that field). Add a minimal purchase-history UI list so extracted purchases are actually visible.

**Tests:** Using the Step 5 fixture set, assert each in-scope fixture produces a `purchases` row with the expected merchant/date/item/price/category (allowing for the eval-style tolerance described in the design's testing strategy, not brittle exact-string matching); assert a fixture engineered to have no confident price/merchant lands in the review queue instead of creating a bad row.

**Integration with previous work:** Consumes the classification results from Steps 5–6; writes to the `purchases` table from Step 2.

**Demo:** Run the full backfill-through-extraction pipeline against a connected account and see real purchase rows appear in the new purchase-history UI list, with prices, dates, and images.

---

### Step 8: Wardrobe seeding and Wardrobe Service CRUD

**Objective:** Auto-seed `wardrobe_items` from each new `purchases` row, and let the user freely manage the wardrobe: add non-purchased items, edit any item, and mark items returned/no-longer-owned.

**Implementation guidance:** Trigger wardrobe seeding immediately after a purchase row is created in Step 7 (`wardrobe_items.source_purchase_id` set). Build the wardrobe UI: list view, manual "add item" form (for gifts/hand-me-downs/in-store purchases), edit form, and a "mark returned" action that flips `status` without deleting the row or its linked purchase.

**Tests:** A test that creating a purchase (Step 7's flow) automatically creates a linked wardrobe item; CRUD tests for manual add/edit; a test that marking an item returned excludes it from "active wardrobe" queries while the underlying purchase row remains untouched.

**Integration with previous work:** Directly extends Step 7's purchase-creation path; uses the `wardrobe_items` table from Step 2.

**Demo:** After running a backfill (Steps 5–7), open the wardrobe UI and see it pre-populated; add a manual item, edit one, mark another as returned, and see the active wardrobe list update accordingly.

---

### Step 9: Scheduled periodic sync + manual "sync now"

**Objective:** Move sync from an ad-hoc trigger (used for testing in Steps 5–8) to the real product behavior: an automatic periodic background poll and a manual "sync now" button, both driving the same pipeline.

**Implementation guidance:** Add the `pg_cron` scheduled job invoking the Steps 5–7 pipeline (fetch → classify → extract → seed wardrobe) for every connection with `status = 'connected'`; add a "sync now" UI button hitting the same pipeline on demand, using the persisted sync cursor (Gmail `historyId` / Graph delta token) so repeat runs only fetch new mail, not the full 6-month window again.

**Tests:** A test that the scheduled job function processes only connections with `status = 'connected'` (skipping disconnected ones, per Step 4); a test that a second sync run with a stored cursor only fetches emails newer than the cursor, not the full backfill window again; a test that "sync now" and the scheduled job invoke the identical underlying pipeline (no duplicated/divergent logic).

**Integration with previous work:** Wires the full Steps 5–8 pipeline into both a scheduler and a manual UI trigger — the first point where the "ongoing sync" requirement (not just one-time backfill) is actually met.

**Demo:** Send a new fixture/test order-confirmation email to the connected test account, wait for (or manually trigger) the next scheduled run, and see it appear as a new purchase and wardrobe item without re-processing anything already synced.

---

### Step 10: Budget Service (manual budget, AI-suggested starting figure, spend tracking)

**Objective:** Let the user set a monthly clothing/shoes/accessories budget, with an AI-suggested starting figure based on historical spend, and show current-month spend and remaining budget.

**Implementation guidance:** Build the budget-setting UI (with the suggested-figure computed from average historical `purchases` spend, shown as a suggestion only, never auto-applied) and the spend-calculation logic scoped to in-scope categories only, reading from `purchases` for the current month.

**Tests:** A test that the suggested figure is computed correctly from seeded historical purchase fixtures but never written to `budgets` without an explicit user action; a test that spend calculation correctly excludes out-of-scope categories and correctly sums the current month only; a test for the "no budget set yet" state showing the "set your first budget" prompt rather than a misleading number.

**Integration with previous work:** Reads `purchases` rows produced by Steps 7–9; writes/reads the `budgets` table from Step 2.

**Demo:** Open the budget page as a new user (no budget set) and see the "set your first budget" prompt with a suggested figure derived from real synced purchase history; set a budget and see current spend/remaining update against it.

---

### Step 11: Structured tag extraction and similarity shortlist matching

**Objective:** Extract and cache structured tags (category, color, style/use-case) for every wardrobe item, and implement the tag-based matching that shortlists similar items — the first half of the hybrid similarity approach.

**Implementation guidance:** Add the vision-LLM tag-extraction call (forced JSON schema) run once per wardrobe item at ingestion time (hook into Step 8's seeding path, and backfill tags for items already seeded in earlier demos), cached on the `wardrobe_items` row. Implement the shortlist query: given a set of tags, return the active wardrobe items with meaningful overlap.

**Tests:** A test that tag extraction runs exactly once per item (cached, not recomputed on every read); golden-example evals (per the design's testing strategy) asserting extracted tags include the correct `category`/`primary_color` for a fixed set of sample items even if exact style-tag wording varies; a test that the shortlist query returns items with overlapping tags and excludes unrelated ones for a fixed probe set.

**Integration with previous work:** Extends Step 8's wardrobe-seeding path with a tagging step; the shortlist query is new capability with no UI yet (wired into the pause screen in Step 13).

**Demo:** Open the wardrobe UI and see each item's extracted tags displayed; run a small "find similar to X" test utility against the seeded wardrobe and see a sensible shortlist returned.

---

### Step 12: Item Extraction Service (URL / screenshot / typed input, with confirmation)

**Objective:** Let the user start the "I want to buy this" flow by pasting a URL, uploading a screenshot, or typing a description, with auto-extracted details always shown for confirmation/correction before proceeding.

**Implementation guidance:** Implement the URL path (server-side fetch + metadata scrape), the screenshot path (vision-LLM call with forced schema for `item_name`/`price`/`image_description`), and the typed-text path (used directly). Build the confirmation UI step common to all three paths, writing a confirmed result into `desired_items` with `pause_status = pending_confirmation` until the user confirms, then `user_confirmed = true`.

**Tests:** A test per input path verifying it produces the expected structured fields from a fixture URL/screenshot/typed string; a test that a failed URL fetch or unparseable screenshot falls back to an empty/best-guess manual-entry form rather than blocking (per the design's error handling); a test that no `desired_items` row is treated as confirmed until the user explicitly confirms.

**Integration with previous work:** Writes into the `desired_items` table from Step 2; is the entry point that Step 13 consumes.

**Demo:** Paste a real product URL and see extracted name/price/image shown for confirmation; upload a screenshot and see the same; type a plain description and see it flow through the same confirmation step; confirm each and see a `desired_items` row created.

---

### Step 13: Redundancy explanation + Pause Decision Screen (core end-to-end demo)

**Objective:** Assemble the full pause decision screen — similar owned items with the redundancy explanation, budget impact, and wait controls — for a confirmed desired item. This is the first point where the app's actual core value proposition is demoable end-to-end.

**Implementation guidance:** Wire a confirmed `desired_items` row (Step 12) through: tag extraction for the desired item itself (reusing Step 11's extraction call), the shortlist query against the active wardrobe (Step 11), an AI call generating the "why this may be redundant" explanation for the shortlist only, and the Step 10 budget-impact calculation. Render all of it together in the pause screen UI, with 24h/7-day wait buttons wired to Step 14's data model (implemented next) but not yet functional beyond storing the choice.

**Tests:** An integration test that, given a confirmed desired item with genuinely similar seeded wardrobe items, the assembled pause-screen payload includes the correct shortlist, a redundancy explanation referencing an actual overlapping attribute (golden-example eval, not exact match), and the correct budget-impact numbers; a test that a desired item with no similar wardrobe items still renders a valid pause screen (empty shortlist handled gracefully, not an error).

**Integration with previous work:** The first step that wires together Steps 10, 11, and 12 into one user-facing flow — the core loop the entire app exists to deliver.

**Demo:** Confirm a desired item that's genuinely similar to something already in the wardrobe (e.g. another navy jacket) and see the full pause screen: the owned similar item with its photo/purchase date, a specific redundancy explanation, and the real effect on the current month's budget.

---

### Step 14: Wait/Reminder Queue (24h/7d in-app waiting)

**Objective:** Make the pause screen's wait option actually functional: choosing to wait sets a timer, and an in-app queue/badge surfaces items whose timer has elapsed — no email or push notifications, per the design.

**Implementation guidance:** Wire the pause screen's wait buttons (stubbed in Step 13) to set `desired_items.wait_until` and `pause_status = waiting`; add an in-app badge/queue view, checked on app load, that lists items whose `wait_until` has passed and prompts the user to decide (proceed, or drop it).

**Tests:** A test that choosing "wait 24h" or "wait 7d" sets the correct `wait_until` timestamp and `pause_status`; a test that the waiting-queue query correctly separates elapsed vs. still-waiting items; a test confirming no notification/email-sending code path exists or fires for this feature (consistent with the in-app-only requirement).

**Integration with previous work:** Completes the wait-control UI stubbed in Step 13; reads/writes the `desired_items` fields from Step 2.

**Demo:** From the pause screen, choose "wait 24 hours" on an item; manually adjust its `wait_until` to the past (simulating elapsed time) and reload the app to see it surface in the waiting badge/queue, prompting a decision.

---

### Step 15: Post-Wait Recommendations (comparables, secondhand, outfit ideas, wishlist)

**Objective:** When the user decides they still want the item (immediately or after waiting), show AI best-guess lower-priced comparables and secondhand suggestions, text-based outfit ideas referencing existing wardrobe photos, and a "save for later" wishlist option.

**Implementation guidance:** Add the AI calls (forced JSON schema) for best-guess comparables and secondhand suggestions (explicitly labeled in the UI as suggestions, not verified listings, per the design's constraints) and for outfit-idea text generation referencing the user's actual wardrobe item names/photos. Implement "save for later" as `pause_status = saved_for_later`, with a wishlist view listing those items.

**Tests:** A golden-example eval test that outfit-idea suggestions reference wardrobe items that actually exist for the test user (not hallucinated items); a test that comparables/secondhand suggestions are rendered with the required "not verified" labeling; a test that "save for later" correctly sets `pause_status` and that the wishlist view lists exactly the saved items.

**Integration with previous work:** Triggered from the "proceed" branch of Step 13/14's flow; reads `wardrobe_items` for outfit-idea grounding and writes `desired_items.pause_status`/`decision_outcome`.

**Demo:** From the pause screen (or after a wait timer elapses), choose "I still want this" and see lower-priced comparable suggestions, secondhand options, an outfit idea referencing real wardrobe items, and a "save for later" button that adds it to a visible wishlist.

---

### Step 16: Failure-mode hardening across all flows

**Objective:** Explicitly implement and test every failure-mode behavior from the design's Error Handling section that earlier steps only partially covered, so the app degrades gracefully everywhere rather than crashing or silently misbehaving.

**Implementation guidance:** Consolidate and verify: low-confidence email extraction routes to the review queue (Step 7) rather than creating a bad purchase row; URL-scrape/screenshot-parse failure falls back to manual entry (Step 12); expired/revoked OAuth tokens (including the accepted 7-day testing-mode expiry) mark the connection `expired` and prompt reconnection instead of silently failing sync (Steps 3/9); ambiguous classification even after LLM fallback lands in review rather than being force-decided (Step 6); missing budget data shows the "set your first budget" prompt rather than a misleading number (Step 10, already partially covered — extend to the pause screen's budget section).

**Tests:** One integration test per failure mode listed above, each asserting the specific graceful-degradation behavior the design specifies (not just "doesn't crash") — e.g. the OAuth-expiry test asserts sync stops for that connection AND the UI shows a reconnect prompt, not just that no exception is thrown.

**Integration with previous work:** Touches Steps 3, 6, 7, 9, 10, and 12 directly — this step has no new user-facing feature of its own, only hardening of existing ones, which is why it comes last rather than being spread as untested "TODO" stubs earlier.

**Demo:** Deliberately trigger each failure mode against the running app (an expired test token, a URL that returns a 403, a screenshot with no identifiable product, a new user with no budget) and show the app responding with the specific graceful behavior the design calls for, end to end.
