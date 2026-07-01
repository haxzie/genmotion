import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Live model + DB integration: generous timeouts.
    testTimeout: 240_000,
    hookTimeout: 60_000,
  },
});
