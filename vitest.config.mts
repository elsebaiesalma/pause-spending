import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        // next-auth/@auth ship ESM .js files that bare-import "next/server" -
        // Next 16's package.json has no "exports" map for that subpath, which
        // only Vite's own resolver tolerates. Externalized (the Vitest
        // default for node_modules) hands the file to Node's native loader
        // instead, which enforces strict ESM resolution and fails. Inlining
        // routes it through Vite's transform/resolve pipeline instead.
        inline: [/next-auth/, /@auth\//],
      },
    },
    // Integration tests share one Postgres database and one seeded user row
    // (this is a single-user app by design), so concurrent test files can
    // race on the same rows. Run files sequentially to avoid that.
    fileParallelism: false,
    // The default 5s has intermittently been too tight for genuinely
    // DB-bound tests (several sequential Prisma round-trips) under system
    // load, not because anything is actually hung - these tests pass in
    // well under a second in isolation. Raised again from 10s: several
    // pending-migration modules (src/lib/pauseScreen/reflection.ts,
    // src/lib/considering/consideringMeta.ts) now make raw-SQL calls that
    // fail against Neon and get caught, and each failure is itself a real,
    // sometimes-slow network round trip - a few of those in sequence can
    // exceed 10s even though nothing is hung.
    testTimeout: 20000,
    // Vitest's hook timeout is a SEPARATE setting from testTimeout (default
    // 10s regardless of the value above) - an afterEach that deletes a row
    // it just created is normally instant, but when it runs right after a
    // test that made several failing raw-SQL calls (see testTimeout's
    // comment), the connection can still be under enough load that even
    // this simple cleanup call exceeds 10s. When that happens the delete
    // never runs, silently leaking a row into the shared test database for
    // every later test to trip over - this happened for real once already
    // (a leaked $80 desired_items row inflated every src/lib/dashboard/
    // kept.test.ts total by exactly $80 until it was found and deleted by
    // hand). Raised to match testTimeout so cleanup always gets to run.
    hookTimeout: 20000,
  },
});
