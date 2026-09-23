// Applies a Prisma migration's SQL file directly via Neon's HTTP driver and
// records it in `_prisma_migrations`. Needed because `prisma migrate
// dev`/`deploy` connect over raw Postgres wire protocol (port 5432), which is
// blocked in some sandboxed dev environments even though HTTPS (443) works.
// On a machine/CI with normal Postgres connectivity, prefer the standard
// `prisma migrate deploy` instead — this script exists as a fallback so
// migrations can still be applied and correctly tracked when that port is
// unavailable.
//
// Usage: node scripts/apply-migration-via-http.mjs <migration_folder_name>
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const migrationName = process.argv[2];
if (!migrationName) {
  console.error("Usage: node scripts/apply-migration-via-http.mjs <migration_name>");
  process.exit(1);
}

const migrationPath = `prisma/migrations/${migrationName}/migration.sql`;
const migrationSql = readFileSync(migrationPath, "utf8");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const statements = migrationSql
    .split(/;\r?\n/)
    .map((s) => s.trim())
    .filter((s) => {
      const withoutComments = s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();
      return withoutComments.length > 0;
    });

  for (const stmt of statements) {
    const preview = stmt.split("\n").find((l) => !l.trim().startsWith("--"))?.slice(0, 70);
    console.log("Running:", preview);
    await sql.query(stmt);
  }

  await sql.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    )
  `);

  const checksum = crypto.createHash("sha256").update(migrationSql).digest("hex");
  const id = crypto.randomUUID();

  await sql.query(
    `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
     VALUES ($1, $2, now(), $3, now(), $4)`,
    [id, checksum, migrationName, statements.length]
  );

  console.log("Applied and recorded migration:", migrationName, "checksum:", checksum);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
