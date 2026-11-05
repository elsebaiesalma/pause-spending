# Prior Art: Wardrobe Apps and Receipt-Parsing Finance Apps

## Whering (digital closet + AI stylist)

- Lets users build their wardrobe either by manually uploading photos of clothes or by pulling from a large pre-existing brand/product database, reducing manual entry effort — directly relevant to this project's "seed wardrobe from purchase history, edit freely" model (idea-honing Q2): the app should similarly minimize manual re-entry by auto-populating from parsed receipts wherever possible.
- AI suggests full outfits based on wardrobe contents, personal style, and even weather, and proactively suggests a daily outfit from previously-worn combinations — a more ambitious version of this project's "outfit ideas styled around the desired item" feature, worth treating as a future-upgrade direction rather than MVP scope.
- Deliberately ships features incrementally based on user feedback rather than launching with everything at once — reinforces the PDD/MVP approach already being followed here (defer live search integration, outfit image generation, etc.). [Whering: A Masterclass in UX](https://medium.com/@HannahFberg/whering-a-masterclass-in-ux-understanding-the-5-elements-of-ux-through-this-digital-closet-app-3a1fb6663bd2), [The Best Digital Wardrobe & Styling Apps](https://whering.co.uk/best-wardrobe-apps-2025)

## Indyx (closet tracking + cost-per-wear)

- Auto-tags items with AI and automatically removes/cleans up background from item photos on upload — a useful UX detail: when a wardrobe item is seeded from a receipt's product photo (often on a white/branded background already), cleanup may be unnecessary, but for photos added by the user manually this kind of auto-cleanup meaningfully improves the "wardrobe as a visual list" experience.
- Calculates **cost-per-wear** from purchase price + logged wear frequency, and gives a dashboard of closet composition/usage over time. This isn't in this project's current scope, but it's a natural extension of data already being collected (purchase price is already parsed from receipts) — worth noting as a plausible V2 feature rather than something to design against now. [Indyx App Review](https://theeliseedit.com/blog/my-honest-review-of-the-indyx-app), [Catalog, Style, Resell Your Closet — Indyx](https://www.myindyx.com/)

## Rocket Money (transaction categorization, Mint's replacement)

- Automatically categorizes every transaction as it comes in, with user-adjustable rules and manual override — directly analogous to this project's need to classify parsed purchases into "clothing/shoes/accessories" vs excluded categories, and supports the idea-honing decision to let users correct/add items manually: the pattern is "auto-categorize by default, always allow correction," not "ask the user to categorize everything."
- Rocket Money's core data source is bank/card transaction feeds via Plaid, not email parsing — meaningfully different from this project's email-receipt-based approach, so its categorization *rules engine* pattern is the transferable idea, not its data pipeline. [Track your spending — Rocket Money](https://www.rocketmoney.com/feature/spending-insights)
- **Gap:** search didn't surface any consumer app that does email-receipt parsing as its primary transaction source (most personal-finance apps use bank-feed aggregators like Plaid instead) — this project's approach is somewhat novel in that respect, which is consistent with the original idea's explicit reasoning for avoiding a Shopify-style dependency, but means there's less directly-transferable prior art for the parsing pipeline itself beyond the general email-parsing techniques covered in `email-receipt-parsing.md`.

## Key takeaways for design
- Auto-populate the wardrobe from parsed receipts by default (like Whering's product-database pull), with manual add/edit always available — don't make cataloging feel like a second data-entry job.
- Follow Rocket Money's "auto-categorize, let the user correct" pattern for classifying purchases into the clothing/shoes/accessories scope, rather than requiring the user to manually categorize every parsed item.
- Cost-per-wear (Indyx) and full AI-generated daily outfits (Whering) are both good candidate V2 features once the core pause/reflect flow is validated, but neither is required for this project's current MVP scope.
- No close prior-art match exists for "email-receipt-parsing as primary transaction source" specifically — treat the parsing pipeline as the project's genuinely novel technical piece, not something to copy from an existing product.
