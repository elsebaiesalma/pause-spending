# Hosting and Backend Stack

## Framework + database

A single full-stack framework with an integrated backend (API routes/server actions) + a managed Postgres database is the simplest shape that satisfies "hosted cloud service, single-user now, multi-user-ready later" without over-engineering:
- **Next.js** (or an equivalent full-stack framework) for both the UI and the server-side API routes that do email sync, OAuth token exchange, and AI extraction calls.
- **Managed Postgres** (e.g. Neon, Supabase, RDS, Aurora) rather than self-managed — gets encryption at rest, backups, and connection pooling without operational burden, and all of the major managed providers support `pg_cron` for the scheduling need below. [Postgres cron jobs guide](https://crontap.com/guides/postgres-cron-jobs)

This isn't a novel architecture decision specific to this project — it's the default "boring, well-supported" stack for a small hosted app, chosen here specifically because it minimizes new infrastructure to learn/operate for a single-user MVP.

## Encryption at rest

Two different things need to be encrypted at rest, and they warrant different treatment:
1. **The database as a whole** — covered by the managed Postgres provider's disk/storage-level encryption (standard on Neon/Supabase/RDS by default) — no extra app-level work needed.
2. **OAuth refresh tokens specifically** — these are the most sensitive data in the system (a leaked token grants ongoing email read access) and deserve column-level encryption on top of disk encryption, not just reliance on the provider's disk encryption. The standard pattern is **envelope encryption**: a per-record or per-user Data Encryption Key (DEK) encrypts the token, and the DEK itself is wrapped by a Key Encryption Key (KEK) held in a cloud KMS; the app calls KMS to unwrap the DEK, then uses `pgcrypto`/AES-256-GCM to decrypt the token value, storing the result as a versioned `{iv, tag, ciphertext}` blob in a JSONB column. [Multi-tenant BYOK encryption in PostgreSQL with pgcrypto](https://xata.io/blog/multi-tenant-byok-encryption-in-postgresql-with-pgcrypto), [Encrypt Gmail OAuth tokens at rest with AES-256-GCM](https://github.com/MattSnively/junkpile_unclutter_email/pull/4)

For a single-user MVP, a simpler variant is reasonable: one application-level KEK (from a cloud KMS or secrets manager, not hardcoded) encrypting tokens with AES-256-GCM, without needing per-tenant DEK rotation machinery yet — that's the piece to add if/when multi-user actually happens.

## Background job scheduling for email sync

Given the periodic-poll + manual-sync-button decision, three viable options, roughly in order of simplicity for this project's scale:
- **`pg_cron`** — runs inside Postgres itself as an extension; supported by Neon, Supabase, RDS, Aurora, Crunchy Bridge. Good fit if the sync job's logic can be expressed as a scheduled call to an API endpoint or a stored function. [pg_cron guide](https://crontap.com/guides/postgres-cron-jobs)
- **Platform-native cron** (e.g. Vercel Cron Jobs, if deploying on Vercel) — hits a scheduled API route on an interval; simplest if already deploying serverless on that platform, but only works if the platform supports scheduled invocation (plain serverless functions can't self-schedule). [Cron Jobs in Next.js: Serverless vs Serverful](https://blog.yagyaraj.com/running-cron-jobs-in-nextjs-guide-for-serverful-and-stateless-server-542dd0db0c4c)
- **`pg-boss`** (Postgres-backed job queue) — overkill for a single-user periodic poll; worth it only if the project later needs retry/backoff semantics for many concurrent background jobs (i.e., genuinely useful once multi-user).

The manual "sync now" button is just a normal authenticated API route that runs the same sync function on demand — no separate infrastructure needed beyond the scheduled job itself.

## Key takeaways for design
- Next.js + managed Postgres is sufficient; no need for a separate job-queue service or a different backend framework at this scale.
- Disk-level encryption at rest comes free from the managed Postgres provider; OAuth tokens specifically need an additional application-level encryption layer (KMS-backed key + AES-256-GCM) given they're the most sensitive stored data.
- `pg_cron` (or platform-native cron if deploying serverless) covers the "automatic periodic poll" requirement; the "manual sync now" button is just an on-demand call to the same underlying sync function — no separate mechanism required.
