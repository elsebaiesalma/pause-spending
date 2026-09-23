# Minimal OAuth Scopes and Privacy/Consent Patterns

## Gmail scopes

Two read-only candidates:
- **`gmail.metadata`** — headers and labels only, **no body content and no attachments**. This is a restricted-but-lighter scope.
- **`gmail.readonly`** — full read access to message content (headers + body + attachments).

Since receipt parsing needs the email **body** (item name, price, images), `gmail.metadata` alone is insufficient — the app needs `gmail.readonly`. Both scopes are classified as **restricted** and require Google's security assessment (CASA) before production use beyond 100 test users; `gmail.readonly` additionally sits in the "sensitive/restricted" tier that shows a stronger warning on the OAuth consent screen. [Gmail API Scopes Explained — Unipile](https://www.unipile.com/gmail-api-scopes-guide/), [Restricted Scopes — Google Cloud Console Help](https://support.google.com/cloud/answer/13464325?hl=en), [OAuth 2.0 Scopes — Google for Developers](https://developers.google.com/identity/protocols/oauth2/scopes)

**Implication for a personal/single-user app:** Google's verification/CASA process is intended for apps with many external users; while under ~100 test users (i.e., exactly this project's current single-user scope) it can run in "testing" mode without full verification, but that comes with a 7-day token expiry and an "unverified app" warning screen users must click through. Full verification becomes necessary only once you'd want this reachable by other people — consistent with the "multi-user later, not now" decision.

## Outlook / Microsoft Graph scopes

- **`Mail.Read`** (delegated) — read access to the signed-in user's own mailbox. This is the correct minimal scope; a personal email client should never request `Mail.Read.Shared` (that's for reading *other* mailboxes, e.g. a shared team inbox) — request only what the use case demands. [Mail.Read — Graph Permissions](https://graphpermissions.merill.net/permission/Mail.Read), [Microsoft OAuth scopes for email and calendar](https://developer.nylas.com/docs/cookbook/use-cases/build/microsoft-oauth-scopes/)
- Delegated scopes only grant access to what the signed-in user could already see themselves, and consent happens on Microsoft's standard per-user consent screen — no separate app verification tier like Google's exists for delegated single-tenant personal use.

## Consent-screen and UX implications

Minimal scopes produce a shorter, less alarming consent screen and materially better authorization conversion than requesting broad scopes "just in case" — reported improvements in the 15–30% range for narrowing scope requests. Request `gmail.readonly` (needed) rather than broader scopes like full `mail.google.com` (send/delete/modify) that this app has no reason to need, since it only ever reads receipts. [Gmail API Scopes Explained — Unipile](https://www.unipile.com/gmail-api-scopes-guide/)

## Disconnect + permanent delete pattern

"Disconnect" is ambiguous unless the app defines exactly what it means — treat it as two distinct, clearly-labeled actions rather than one button:
1. **Revoke token / stop syncing** — call the provider's token revocation endpoint (Google's `oauth2.revoke` / Microsoft's equivalent), mark the connection inactive, stop scheduled sync jobs for that account. The parsed data collected so far is left alone.
2. **Permanent delete** — revoke the token *and* purge all data derived from that connection (parsed receipts, wardrobe items sourced from it, cached images) from the live database. [Design API Access Revocation So Users Know What Actually Gets Deleted](https://dev.to/anakin_writers/design-api-access-revocation-so-users-know-what-actually-gets-deleted-31cg)

For the "permanent delete" path, treat it like a GDPR right-to-erasure request even though this app has no EU compliance obligation yet as a personal tool: erasure should be prompt (no artificial delay), complete across the live database, and should also account for anything in backups/caches, not just the primary tables. [Right to Erasure — GDPR compliance steps](https://www.reform.app/blog/right-to-erasure-gdpr-compliance-steps/), [Art. 17 GDPR](https://gdpr-info.eu/art-17-gdpr/)

## Key takeaways for design
- Gmail needs `gmail.readonly` (body access required for item/price extraction) — `gmail.metadata` is not sufficient. Outlook needs `Mail.Read` only, never `Mail.Read.Shared`.
- At single-user scale, Google's "testing" OAuth mode (no full CASA verification) is usable but comes with a 7-day token expiry and an unverified-app warning — acceptable for a personal tool, revisit if this ever opens up to other users.
- Build "disconnect" (revoke + pause sync, data kept) and "permanently delete" (revoke + purge derived data) as two distinct, explicitly labeled controls per the idea-honing privacy requirement — not one ambiguous button.
- Explicit consent screen before first import (per idea-honing decision) should state plainly what's read (order-confirmation email content) and what's never done (no send/delete/modify access, no sharing/selling of data).
