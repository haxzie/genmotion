import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Live model + DB integration: generous timeouts.
    testTimeout: 240_000,
    hookTimeout: 60_000,
    // One database, truncated between tests — parallel files would race on it.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
  },
});
