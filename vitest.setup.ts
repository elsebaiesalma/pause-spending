import "dotenv/config";

// Integration tests must never run against the real app database - point
// them at a separate Neon branch instead, so test cleanup logic can never
// touch real user data.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set - tests must not run against the real database");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// GMAIL_SYNC_PAUSED is a personal, real-database dev toggle (e.g. while
// mock/seed data is loaded for UI work) - it must never affect the
// separate test database's own sync tests.
delete process.env.GMAIL_SYNC_PAUSED;

// DEV_WARDROBE_VIEW is the same kind of personal toggle: with it set to "seed" in
// .env, every test wardrobe item (which has no source) would be hidden.
delete process.env.DEV_WARDROBE_VIEW;
