import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests share one Postgres database and one seeded user row
    // (this is a single-user app by design), so concurrent test files can
    // race on the same rows. Run files sequentially to avoid that.
    fileParallelism: false,
    // The default 5s has intermittently been too tight for genuinely
    // DB-bound tests (several sequential Prisma round-trips) under system
    // load, not because anything is actually hung - these tests pass in
    // well under a second in isolation.
    testTimeout: 10000,
  },
});
