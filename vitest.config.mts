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
  },
});
