import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// The monorepo keeps a single root .env (see AGENTS.md); apps/api and
// apps/renderer load it explicitly via `tsx --env-file=../../.env`, but Next
// only looks inside its own directory. Load it here for the same reason.
// Values already present in the real environment win, so deployments that set
// variables directly are unaffected — and a missing file is normal in prod.
try {
  process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));
} catch {
  // No root .env — rely on the ambient environment.
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "@genmotion/shared",
    "@genmotion/motion",
    "@genmotion/player",
    "@genmotion/compiler",
  ],
  async redirects() {
    return [
      // Projects were merged into the app home (alongside the create composer).
      { source: "/projects", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
