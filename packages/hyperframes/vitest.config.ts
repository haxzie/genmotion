import { defineConfig } from "vitest/config";

// The vendored skill pack carries upstream's own node:test files.
export default defineConfig({ test: { environment: "node", include: ["src/**/*.test.ts"] } });
