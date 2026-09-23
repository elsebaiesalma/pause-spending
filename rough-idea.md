# Rough Idea: Pause Before Purchase

Build a privacy-first web app called Pause Before Purchase that helps users avoid impulse shopping.

Use email receipt parsing as the primary transaction source (Gmail/Outlook OAuth); do not depend on Shopify, since it is not a universal consumer purchase-history source. Extract merchant, date, item name, price, category, and product image/link from order-confirmation emails. Let users correct or add items manually.

## Core flow

1. User pastes a product URL, uploads a screenshot, or types an item they want to buy.
2. Analyze it against their purchase history and wardrobe inventory.
3. Show a calm, nonjudgmental "pause" decision screen:
   - Similar items they already own, with images and purchase dates
   - Why the new item may be redundant (same color, style, category, or use case)
   - Their monthly shopping spend, remaining budget, and how this purchase changes it
   - A 24-hour/7-day wait option with a reminder
4. If they still want it, offer:
   - Lower-priced comparable items
   - Secondhand/resale options
   - Outfit ideas using items they already own, styled around the desired item's look
   - A "save for later" wishlist
