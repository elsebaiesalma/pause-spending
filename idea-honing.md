# Idea Honing: Pause Before Purchase

## Q1: Who is this for — just you personally, or a multi-user product?

Is this initially a personal tool just for you (single user, no signup/account system needed beyond your own OAuth login), or do you want it built from the start as a multi-user product other people could sign up for and use independently? This affects how much auth, data isolation, and account infrastructure is worth building now versus later.

**Answer:** Initially a personal tool, just for the user themselves. No multi-user signup system needed for now.

## Q2: What exactly is the "wardrobe inventory" — is it just parsed purchase history, or a separate curated list?

Is "wardrobe inventory" simply every clothing/relevant item found via email receipt parsing (so parsed purchases *are* the wardrobe), or is it a distinct, separately maintained list of items you currently own and still keep/use? The difference matters because purchase history includes things you may have later returned, given away, or that were never bought online at all (gifts, hand-me-downs, in-store cash purchases). Options:
- (a) Wardrobe = purchase history only (simplest, but can include items you no longer own)
- (b) Wardrobe = purchase history, with a way to mark items as returned/no-longer-owned so they drop out
- (c) Wardrobe = a separate list you build (can seed it from purchase history, then add/remove/edit freely, including non-purchased items)

**Answer:** Option (c) — wardrobe is a separate, freely editable list (seedable from purchase history, can add non-purchased items like gifts/hand-me-downs), combined with (b)'s ability to mark items as returned/no-longer-owned so they drop out of the active wardrobe.

## Q3: How should "similarity" between a desired new item and existing wardrobe items actually be determined?

The pause screen needs to say "you already own something like this — same color/style/category/use case." How should that matching actually work technically? Options:
- (a) AI-based: use an LLM/vision model to compare the new item's image+description against wardrobe item images+descriptions and generate a similarity judgment + reasoning on the fly
- (b) Structured tags: every wardrobe item and every new item gets categorized into structured attributes (category, color, style tags, use-case tags) — either by AI extraction at add-time or manual tagging — and similarity is computed by matching those attributes
- (c) Hybrid: structured tags for fast/cheap filtering (category, color) plus an AI pass only on the shortlist to write the human-readable "why it's redundant" explanation

**Answer:** Option (c) — hybrid. Structured tags (category, color, style/use-case) on every item for fast/cheap filtering and shortlisting, with an AI pass over the shortlist to generate the human-readable "why this may be redundant" explanation.

## Q4: How is "monthly shopping spend / remaining budget" defined and set?

The pause screen shows "monthly shopping spend, remaining budget, and how this purchase changes it." Two sub-questions bundled together:
- **Budget source:** does the user manually set a monthly budget number (e.g. $300/month for discretionary shopping), or is it inferred/suggested from historical spending (e.g. average of past 3 months)?
- **Scope of "shopping spend":** does it count *all* parsed purchase emails (any online order), or only specific categories (e.g. clothing/accessories/discretionary, excluding groceries, bills, subscriptions, gifts for others)? This affects what the email parser needs to categorize at ingestion time.

**Answer:** User manually sets a monthly shopping budget; the app can suggest a starting number based on historical spending, but the number itself is user-set. Scope of "shopping spend" is clothing, accessories, and discretionary purchases only — explicitly excluding groceries, bills, subscriptions, and gifts for others. The email parser needs to categorize/classify purchases into these buckets at ingestion time so non-discretionary spend doesn't count against the budget.

## Q5: For "lower-priced comparable items" and "secondhand/resale options" — live search results, or AI best-guess suggestions?

This is a scoping question with real privacy and accuracy tradeoffs. Options:
- (a) Live web/shopping search: query real search APIs or specific marketplaces (e.g. eBay, Poshmark, ThredUp, Google Shopping) at request time to get real, current listings/prices. More accurate and useful, but means sending the desired-item description out to third-party services — a privacy tradeoff worth being explicit about even in a "privacy-first" app (this would only send the *item you're considering buying*, never your purchase history or wardrobe data).
- (b) AI-generated best guess: an LLM suggests "items like this are often available secondhand on Poshmark/eBay" and ballpark cheaper alternatives without live data — no external requests, more private, but not guaranteed accurate or current, and can't give real links/prices.
- (c) MVP does (b) now, with (a) as a clearly-labeled future upgrade once the core pause/reflect flow is validated.

**Answer:** Option (c) — MVP uses AI-generated best-guess suggestions (no external requests, fully private, but not guaranteed accurate/live) for lower-priced comparables and secondhand/resale options. Live web/shopping search integration is a clearly-labeled future upgrade once the core pause/reflect flow is validated.

## Q6: How should the 24-hour/7-day wait reminder actually be delivered?

Since this is a personal web app (not a mobile app) and you're already granting Gmail/Outlook OAuth access for receipt parsing, how should the reminder land? Options:
- (a) Email reminder — send via the same connected Gmail/Outlook account (needs send-mail OAuth scope in addition to read scope)
- (b) Browser push notification (requires the app to be a PWA with notification permission granted, and only fires if a browser with that permission is running)
- (c) In-app only — no external notification; when you next open the app, a "waiting" queue/badge shows items whose timer has elapsed
- (d) Combination, e.g. (a) + (c) as a fallback

**Answer:** Option (c) — in-app only. No email or push notifications; opening the app shows a "waiting" queue/badge for items whose 24h/7-day timer has elapsed, prompting the user to decide.

## Q7: For a pasted product URL or uploaded screenshot, should the app auto-extract details (fetch the page / vision-parse the image), or rely on manual entry?

When you paste a URL or upload a screenshot of something you're considering buying, how much should the app do automatically versus ask you to fill in?
- (a) Auto-extract: fetch the URL server-side and scrape title/price/image, or run the screenshot through a vision model to identify item name/price/image — then let you confirm/correct before proceeding (fastest, but means the app contacts the external site for URLs, and vision-model calls for screenshots)
- (b) Manual entry only: you type in the item name/price/category yourself; the URL/screenshot is just stored as a reference link/image, not parsed
- (c) Auto-extract for screenshots (vision parse) but manual entry for pasted URLs, or vice versa

**Answer:** Option (a) — auto-extract. For a pasted URL, fetch the page server-side and scrape title/price/image; for a screenshot, run it through a vision model to identify item name/price/image. Either way, always show the extracted details to the user for confirmation/correction before proceeding with the pause analysis.

## Q8: Where does the app and its data actually live — local-only, self-hosted server, or hosted cloud service?

Given the "privacy-first" positioning, this is foundational to the whole architecture:
- (a) Local-only: runs entirely in the browser, data stored in browser storage (IndexedDB) or a local file — no backend server at all. Simplest privacy story, but OAuth email access and server-side URL scraping/vision-model calls are harder or impossible to do fully client-side.
- (b) Self-hosted single-user server: a small backend you run yourself (e.g. on your own machine or a personal server/container), with its own database, that only you access. Full control over data, but you're responsible for running/updating it.
- (c) Hosted cloud service (even if single-user for now): deployed to a cloud provider, with a real database, so it's reachable from anywhere without you managing a server. Less "local privacy" but simpler to run and access from any device.

**Answer:** Option (c) — hosted cloud service (single-user for now), reachable from anywhere without self-managing a server.

Additional constraints given alongside this answer:
- Design privacy-first: authenticated access only, data encrypted in transit and at rest, no sale or sharing of data, minimum necessary email OAuth permissions/scopes, explicit user consent before importing receipts, and easy disconnect + permanent-delete controls for connected accounts and stored data.
- Keep the architecture simple and structured so multi-user support could be added later, but do not build multi-user features (accounts, signup, data isolation UI, etc.) now.

## Q9: Is this app scoped to clothing/fashion items only, or general consumer purchases?

"Wardrobe inventory" and "outfit ideas" are clothing-specific concepts, but "avoid impulse shopping" and the budget/spend tracking read as more general. Which is it?
- (a) Clothing/fashion only: the whole app (purchase parsing, wardrobe, pause screen, outfit ideas) is scoped to clothing, shoes, and accessories. Other purchase categories aren't tracked at all.
- (b) General consumer purchases, with clothing-specific features only applying when relevant: budget tracking, "similar items you own," redundancy reasoning, and price comparisons work across any category (electronics, home goods, beauty, etc.), but "wardrobe" and "outfit ideas" specifically only show up for clothing/accessory items.

**Answer:** Option (a) — scoped to clothing, shoes, and accessories only. The whole app (purchase parsing, wardrobe, pause screen, budget, outfit ideas) is fashion-focused; other purchase categories (electronics, home goods, etc.) are not tracked.

## Q10: When connecting Gmail/Outlook, should the app backfill past order emails, and how does ongoing sync work?

- **Backfill:** on first connect, should it scan back through email history (e.g. last 6/12 months, or all-time) to build initial purchase history/wardrobe, or start fresh and only track new receipts from the connection date forward?
- **Ongoing sync:** should new receipts be picked up automatically on some schedule (e.g. periodic background poll), or only when the user clicks a manual "sync now" button?

**Answer:** Yes, backfill on first connect — scans the last 6 months of email history to build initial purchase history/wardrobe. Ongoing sync uses both an automatic periodic background poll (so new receipts stay current without user action) and a manual "sync now" button for on-demand refresh.

## Q11 (post-research checkpoint): Outfit ideas, OAuth mode, and email classification reliability

Research (see `research/`) raised three decisions:
- **Outfit ideas** — MVP gives text suggestions referencing existing wardrobe photos, not generated composite outfit images.
- **OAuth mode** — stay in Google's "testing mode" for now (weekly Gmail re-auth + an "unverified app" warning screen) rather than pursuing full app verification immediately.
- **Email classification reliability** — flagged that "is this a fashion order + which budget category" relies on LLM judgment with no reliable rule-based signal, and asked if that's acceptable.

**Answer:**
- Outfit ideas: confirmed — text suggestions referencing existing wardrobe photos for MVP.
- OAuth mode: confirmed — testing mode for now.
- Email classification: **not acceptable as pure LLM-judgment** — user wants a stricter/more reliable approach. Follow-up needed on what specifically to tighten (see Q12).

## Q12: How should email classification reliability actually be improved?

**Answer:** Hybrid approach — maintain a rule-based pre-filter (known fashion-retailer sender domains/keywords) that confidently classifies the common case without LLM involvement; only genuinely ambiguous emails get routed to the LLM for classification. This reduces LLM-driven misses/false-positives for the majority of receipts from well-known retailers, reserving LLM judgment for the long tail.

