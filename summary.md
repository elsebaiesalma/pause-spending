# Pause Before Purchase — PDD Summary

## Artifacts created

- `rough-idea.md` — the original concept, verbatim
- `idea-honing.md` — 12 requirements-clarification Q&As covering user scope, wardrobe model, similarity matching, budget definition, comparables approach, reminders, input extraction, hosting/privacy architecture, category scope, and email sync, plus a post-research checkpoint that revised email classification to a hybrid rule+LLM approach
- `research/email-receipt-parsing.md` — Gmail API vs. Graph API vs. IMAP, classification approach, image extraction
- `research/oauth-scopes-and-privacy.md` — minimal OAuth scopes, consent/verification requirements, disconnect/delete UX
- `research/ai-tagging-and-vision.md` — vision-LLM approach covering tagging, screenshot parsing, redundancy explanations, outfit ideas
- `research/hosting-and-backend-stack.md` — Next.js + managed Postgres + `pg_cron`, token encryption approach
- `research/multi-tenant-readiness.md` — `user_id`-on-every-table as the full cost of future-proofing
- `research/prior-art.md` — UX patterns from Whering/Indyx/Rocket Money; confirms the email-parsing ingestion pipeline is novel
- `design/detailed-design.md` — standalone detailed design: overview, consolidated requirements, architecture + sequence diagrams, 10 components, 6-table data model with ER diagram, error handling, testing strategy, and 4 appendices
- `implementation/plan.md` — 16-step, test-driven implementation plan with a tracking checklist

## Overview

**Design:** A privacy-first, single-user (multi-tenant-ready) web app scoped strictly to clothing/shoes/accessories. It parses Gmail/Outlook order-confirmation emails (hybrid rule+LLM classification, 6-month backfill, dual scheduled/manual sync) into a purchase history that seeds a freely-editable wardrobe. At the moment of a new purchase impulse, it shows a pause screen combining similar owned items (hybrid tag-matching + AI explanation), budget impact, and an in-app-only 24h/7-day wait option. If the user still wants the item, it offers AI-best-guess comparables/secondhand suggestions, text-based outfit ideas from the real wardrobe, and a save-for-later wishlist. Hosted on Next.js + managed Postgres, with app-level encryption on top of provider disk encryption for OAuth tokens, and accepted known limitations around Google's OAuth testing-mode (weekly re-auth, unverified-app warning) and AI classification/suggestion accuracy.

**Implementation plan:** 16 steps sequenced so real end-to-end value lands early — schema and OAuth first (Steps 1–4), the full email-sync-to-wardrobe pipeline next (Steps 5–9), budget and similarity matching after that (Steps 10–11), then the actual "I want to buy this" flow culminating in the first full pause-screen demo at Step 13, followed by the wait queue, post-wait recommendations, and a final hardening pass over every failure mode named in the design.

## Next steps

1. Review `implementation/plan.md` and start with Step 1 — project scaffold, DB connection, health check.
2. Decide on the specific ORM (Prisma vs. Drizzle) and managed Postgres provider before Step 1, since the plan assumes one is picked and used consistently.
3. Line up API credentials early (Google Cloud OAuth client in testing mode, Microsoft Azure AD app registration) since Step 3 needs them.

## Areas that may need further refinement

- The exact fashion-retailer sender-domain/keyword list for the rule-based pre-filter (Step 5) isn't specified — this will need to be built and tuned against real inbox data once backfill testing starts.
- The specific vision-capable LLM/model choice for tagging, screenshot parsing, and text generation is left open in the design's appendix — worth pinning down before Step 6/11/12.
