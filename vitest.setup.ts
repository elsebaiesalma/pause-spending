import "dotenv/config";

// Integration tests must never run against the real app database - point
// them at a separate Neon branch instead, so test cleanup logic can never
// touch real user data.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set - tests must not run against the real database");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
