/**
 * `build.mjs`, pointed at the local stack instead of the hosted API.
 *
 * A packaged app has no `process.env` to speak of once launched from Finder —
 * `build-main.mjs`'s `cloudDefines()` is what bakes `GM_CLOUD_API_URL`/
 * `GM_CLOUD_WEB_URL` into the bundle at build time, but only when those vars
 * are actually set in the environment the build runs in. `dev.mjs` gets this
 * for free by loading the root `.env` before spawning Electron; a packaged
 * build needs the same thing done before esbuild runs.
 *
 * Deliberately its own script rather than a flag on `build.mjs`: that one is
 * also what CI's `pnpm release:mac` calls for a real, signed, published
 * release, and a real release must never pick up a developer's local `.env`
 * by accident — `build-main.mjs`'s own comment says as much. Loading `.env`
 * here, in a script only `package:local`/`dist:local` reach for, keeps that
 * guarantee: the ordinary `package`/`dist`/`release:mac` scripts are
 * untouched and still see an empty environment unless someone explicitly
 * exports these vars themselves.
 *
 *   docker compose up -d && pnpm dev   # api :4001, in another terminal
 *   pnpm --filter @genmotion/desktop package:local
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(path.join(root, "../../.env"));
  console.log(
    `local build: GM_CLOUD_API_URL=${process.env.GM_CLOUD_API_URL ?? "(unset — falling back to hosted)"}`,
  );
} catch {
  console.log("local build: no root .env found — falling back to the hosted API");
}

// Triggers `build.mjs`'s top-level build sequence now that the env vars it
// reads are in place. A plain `import`, not a re-implementation: one build
// pipeline, never two copies to keep in sync.
await import("./build.mjs");
