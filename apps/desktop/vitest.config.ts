import { defineConfig } from "vitest/config";

/**
 * Its own config so vitest does not inherit `vite.config.ts`, which is the
 * *renderer's* build — browser platform, `@/` aliased into the web app. These
 * tests cover main-process modules, which are plain node.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["electron/**/*.test.ts"],
  },
});
